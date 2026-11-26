package service

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	pathpkg "path"
	"path/filepath"
	"regexp"
	"strings"

	"nginx-mgr/internal/executor"
	"nginx-mgr/internal/model"
)

// 官方 nginx 源码包（nginx.org 的 tarball）**不包含** ACME 模块：
//   - `--with-http_acme_module` 并不是 nginx 的 configure 选项，传了只会得到
//     `invalid option "--with-http_acme_module"`，随后整体退回标准模块集，
//     `acme_certificate` / `$acme_certificate` 就永远不可用；
//   - 真正提供这些指令的是第三方模块 https://github.com/nginx/nginx-acme（Rust 写的），
//     必须单独编译成动态模块（.so），再在主配置里 load_module。
//
// 本文件负责三件事：
//  1. 在源码编译安装 nginx 之后，把 nginx-acme 编成动态模块并装到 <prefix>/modules/；
//  2. 幂等地把 load_module / resolver / acme_shared_zone 写进主配置；
//  3. 写一份 acme_issuer（Let's Encrypt）配置，让站点模板里的 acme_certificate 能通过 nginx -t。
const (
	acmeRepoURL    = "https://github.com/nginx/nginx-acme"
	acmeModuleSo   = "ngx_http_acme_module.so"
	acmeSrcDefault = "/usr/local/src/nginx-acme"
	acmeIssuerFile = "00-acme-issuer.conf"
	acmeStateDir   = "acme"
)

// acmeLoadModuleLine 是主配置里挂载模块的指令（相对 prefix，即 /usr/local/nginx/modules/...）。
const acmeLoadModuleLine = "load_module modules/" + acmeModuleSo + ";"

var acmeResolverLineRe = regexp.MustCompile(`(?m)^\s*resolver\s`)

// ACMESrcDir 返回 nginx-acme 源码目录，可用环境变量 NGX_ACME_SRC 覆盖。
func ACMESrcDir() string {
	if v := strings.TrimSpace(os.Getenv("NGX_ACME_SRC")); v != "" {
		return v
	}
	return acmeSrcDefault
}

// ACMEModulePath 返回动态模块的安装路径。
func ACMEModulePath() string {
	return filepath.Join(model.NginxPrefix, "modules", acmeModuleSo)
}

// ACMEModuleInstalled 报告动态模块文件是否已就位。
func ACMEModuleInstalled() bool {
	info, err := os.Stat(ACMEModulePath())
	return err == nil && info.Size() > 0
}

// BuildACMEModule 把 nginx-acme 编译成动态模块并安装到 <prefix>/modules/。
// nginxSrcDir 必须是**已经 configure 过**的 nginx 源码目录（objs/ngx_auto_config.h 存在），
// 模块靠它生成与当前 nginx 匹配的绑定，因此必须在 configure 之后调用。
func BuildACMEModule(ctx context.Context, status *executor.TaskStatus, nginxSrcDir string) error {
	objs := filepath.Join(nginxSrcDir, "objs")
	if _, err := os.Stat(filepath.Join(objs, "ngx_auto_config.h")); err != nil {
		return fmt.Errorf("nginx 源码未 configure（缺 objs/ngx_auto_config.h）: %w", err)
	}

	status.AddLog(">>> 编译 ACME 动态模块（nginx-acme / Rust）")
	cargo, err := acmeEnsureToolchain(ctx, status)
	if err != nil {
		return err
	}

	src, err := acmePrepareSource(ctx, status)
	if err != nil {
		return err
	}

	// NGINX_BUILD_DIR 必须指向已 configure 的 objs；内存小的机器固定单并发，避免 OOM。
	build := fmt.Sprintf("NGINX_BUILD_DIR=%s CARGO_BUILD_JOBS=1 %s build --release -j 1",
		shellQuote(objs), shellQuote(cargo))
	if err := executor.ExecuteCommandIn(ctx, status, src, "bash", "-lc", build); err != nil {
		return fmt.Errorf("cargo build 失败: %w", err)
	}

	so := filepath.Join(src, "target", "release", "libnginx_acme.so")
	if info, err := os.Stat(so); err != nil || info.Size() == 0 {
		return fmt.Errorf("未生成模块文件: %s", so)
	}
	if err := installFile(so, ACMEModulePath(), 0o755); err != nil {
		return fmt.Errorf("安装模块失败: %w", err)
	}
	status.AddLog("✅ ACME 动态模块已安装: " + ACMEModulePath())
	return nil
}

// acmeEnsureToolchain 确保 cargo / clang / pkg-config 可用，返回 cargo 的绝对路径。
// 依赖缺失时尝试自动补齐（apt 系统装编译依赖，cargo 缺失时装 rustup）。
func acmeEnsureToolchain(ctx context.Context, status *executor.TaskStatus) (string, error) {
	if cargo := acmeFindCargo(); cargo != "" {
		if acmeHasLibclang() {
			return cargo, nil
		}
	}

	status.AddLog("   补装编译依赖（clang / libclang / pkg-config / 开发头文件）")
	_ = executor.ExecuteCommand(ctx, status, "apt-get", "install", "-y", "--no-install-recommends",
		"clang", "libclang-dev", "pkg-config", "libssl-dev", "libpcre2-dev", "zlib1g-dev",
		"git", "build-essential", "ca-certificates", "curl")

	if acmeFindCargo() == "" {
		if os.Getenv("NGX_NOVA_SKIP_RUSTUP") != "" {
			return "", fmt.Errorf("缺少 cargo，且已设置 NGX_NOVA_SKIP_RUSTUP")
		}
		status.AddLog("   安装 Rust 工具链（rustup, minimal profile）")
		script := `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal --default-toolchain stable`
		if err := executor.ExecuteCommand(ctx, status, "bash", "-lc", script); err != nil {
			return "", fmt.Errorf("安装 Rust 失败（可手动执行 scripts/install-acme-module.sh）: %w", err)
		}
	}

	cargo := acmeFindCargo()
	if cargo == "" {
		return "", fmt.Errorf("未找到 cargo（尝试过 rustup 安装）")
	}
	if !acmeHasLibclang() {
		return "", fmt.Errorf("缺少 libclang（rust-bindgen 需要），请安装 libclang-dev")
	}
	return cargo, nil
}

// acmeFindCargo 在常见位置与 PATH 中查找 cargo。
func acmeFindCargo() string {
	for _, p := range []string{
		"/root/.cargo/bin/cargo",
		"/usr/local/cargo/bin/cargo",
		"/home/" + model.NginxUser + "/.cargo/bin/cargo",
	} {
		if info, err := os.Stat(p); err == nil && !info.IsDir() {
			return p
		}
	}
	if p, err := exec.LookPath("cargo"); err == nil {
		return p
	}
	return ""
}

// acmeHasLibclang 判断系统里是否存在 libclang 共享库。
func acmeHasLibclang() bool {
	matches, _ := filepath.Glob("/usr/lib/llvm-*/lib/libclang.so*")
	if len(matches) > 0 {
		return true
	}
	for _, p := range []string{"/usr/lib/x86_64-linux-gnu/libclang.so", "/usr/lib/libclang.so"} {
		if _, err := os.Stat(p); err == nil {
			return true
		}
	}
	return false
}

// acmePrepareSource 拉取（或更新）nginx-acme 源码，返回目录。
func acmePrepareSource(ctx context.Context, status *executor.TaskStatus) (string, error) {
	src := ACMESrcDir()
	if _, err := os.Stat(filepath.Join(src, "Cargo.toml")); err == nil {
		status.AddLog("   复用已有源码: " + src)
		return src, nil
	}
	_ = os.MkdirAll(filepath.Dir(src), 0o755)
	_ = os.RemoveAll(src) // 半成品目录不可复用
	status.AddLog("   克隆 nginx-acme: " + acmeRepoURL)
	if err := executor.ExecuteCommand(ctx, status, "git", "clone", "--depth", "1", acmeRepoURL, src); err != nil {
		return "", fmt.Errorf("克隆 nginx-acme 失败: %w", err)
	}
	return src, nil
}

// WireACME 幂等地把 ACME 模块接进主配置：
//   - load_module 挂载动态模块；
//   - http 块补 resolver（模块签发证书要解析 ACME 服务域名）与 acme_shared_zone；
//   - conf.d 写一份 acme_issuer，站点模板里的 acme_certificate letsencrypt 才有定义。
func WireACME(status *executor.TaskStatus) error {
	confDir := model.ConfDir()
	mainConf := filepath.Join(confDir, "nginx.conf")

	changed, err := patchACMEConf(mainConf)
	if err != nil {
		return fmt.Errorf("改写主配置失败: %w", err)
	}
	if changed {
		status.AddLog("✅ 主配置已挂载 ACME 模块: " + mainConf)
	}

	_ = os.MkdirAll(filepath.Join(confDir, "conf.d"), 0o755)
	_ = os.MkdirAll(filepath.Join(confDir, acmeStateDir), 0o755)

	issuer := filepath.Join(confDir, "conf.d", acmeIssuerFile)
	if _, err := os.Stat(issuer); err != nil {
		if err := os.WriteFile(issuer, []byte(acmeIssuerContent(confDir)), 0o644); err != nil {
			return fmt.Errorf("写入 ACME issuer 失败: %w", err)
		}
		status.AddLog("✅ 已写入 ACME issuer: " + issuer)
	}

	// 让面板立刻知道 acme=true，不必等重启
	model.ResetPathCache()
	model.DetectNginxFeatures()
	return nil
}

// patchACMEConf 就地改写主配置，返回是否发生了改动。已经改过则原样返回。
func patchACMEConf(path string) (bool, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return false, err
	}
	s := string(data)
	orig := s

	if !strings.Contains(s, acmeModuleSo) {
		s = acmeLoadModuleLine + "\n\n" + s
	}
	if idx := strings.Index(s, "http {"); idx >= 0 {
		inject := ""
		if !strings.Contains(s, "acme_shared_zone") {
			inject += "    acme_shared_zone zone=ngx_acme_shared:1M;\n"
		}
		if !acmeResolverLineRe.MatchString(s) {
			inject += "    resolver 1.1.1.1 8.8.8.8 ipv6=off valid=300s;\n"
		}
		if inject != "" {
			s = s[:idx+len("http {")] + "\n" + inject + s[idx+len("http {"):]
		}
	}
	if s == orig {
		return false, nil
	}
	return true, os.WriteFile(path, []byte(s), 0o644)
}

// acmeIssuerContent 生成 acme_issuer 配置内容。
func acmeIssuerContent(confDir string) string {
	return `# 由 ngx-nova 生成：nginx-acme 模块（https://github.com/nginx/nginx-acme）的 Let's Encrypt 签发器。
# 站点 server{} 里写 acme_certificate letsencrypt 即可自动签发/续期，无需手工放证书文件。
acme_issuer letsencrypt {
    uri              https://acme-v02.api.letsencrypt.org/directory;
    state_path       ` + pathpkg.Join(confDir, acmeStateDir) + `;
    accept_terms_of_service;
}
`
}

// installFile 复制文件并设置权限（跨分区 rename 不可靠，统一用复制）。
func installFile(src, dst string, mode os.FileMode) error {
	data, err := os.ReadFile(src)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
		return err
	}
	if err := os.WriteFile(dst, data, mode); err != nil {
		return err
	}
	return os.Chmod(dst, mode)
}

// shellQuote 给 shell 参数加单引号，避免路径里有空格时被拆开。
func shellQuote(s string) string {
	return "'" + strings.ReplaceAll(s, "'", `'\''`) + "'"
}
