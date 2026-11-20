package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"nginx-mgr/internal/executor"
	"nginx-mgr/internal/model"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"time"
)

// 版本 → 官方 tarball 的 SHA-256。
// 数值由 2026-11 从 nginx.org 下载并用 nginx 官方 PGP 公钥验签后计算，
// 校验值随二进制内嵌，因此即使下载链路被劫持也无法替换成恶意源码。
var pinnedNginxSources = map[string]string{
	"1.30.7": "2565b5c837050e958f70fb0f73c48e2bca4542ad349fd356f46fb0c72610bc6e",
	"1.31.9": "a11c5eeee2e257f4478f0e649f84b0040787d277d2d3e5233952aa6b6dcb80ad",
}

const (
	nginxDownloadBase = "https://nginx.org/download"
	nginxKeysBase     = "https://nginx.org/keys"
	nginxUnitPath     = "/etc/systemd/system/nginx.service"
)

// NginxBuildOptions 控制源码编译安装行为。
type NginxBuildOptions struct {
	Version          string // 目标版本，默认 stable 通道
	Jobs             int    // 并行编译数，0 = NumCPU
	SkipDependencies bool   // 跳过系统依赖安装（已装好 build-essential 时可加速）
	AllowUnpinned    bool   // 允许编译没有内嵌校验值的版本（不推荐，会显式告警）
	Force            bool   // 忽略第三方模块检测，强制替换现有 nginx
}

func (o *NginxBuildOptions) normalize() error {
	o.Version = strings.TrimSpace(o.Version)
	if o.Version == "" {
		o.Version = model.NginxVersion
	}
	if _, ok := parseNginxVersion(o.Version); !ok {
		return fmt.Errorf("非法的 Nginx 版本号: %q", o.Version)
	}
	if o.Jobs <= 0 {
		o.Jobs = runtime.NumCPU()
	}
	if o.Jobs > 8 {
		// 编译 nginx 在 8 并发后基本没有收益，避免小内存机器 OOM。
		o.Jobs = 8
	}
	return nil
}

// DetectInstalledVersion 读取当前 nginx 版本，返回 "1.30.7" 这类纯版本号。
func DetectInstalledVersion() (string, error) {
	out, err := executor.ExecuteSimple(model.SbinPath(), "-v")
	if err != nil && strings.TrimSpace(out) == "" {
		return "", fmt.Errorf("执行 nginx -v 失败: %w", err)
	}
	v, ok := parseNginxVersion(out)
	if !ok {
		return "", fmt.Errorf("无法解析 nginx 版本输出: %q", strings.TrimSpace(out))
	}
	return v.String(), nil
}

// BuildNginxFromSource 以固定的官方源码 + 校验 + 硬化编译参数安装 nginx。
// 全程日志写入 status，失败时回滚到升级前的二进制。
func BuildNginxFromSource(ctx context.Context, status *executor.TaskStatus, opts NginxBuildOptions) error {
	if err := opts.normalize(); err != nil {
		return err
	}
	if runtime.GOOS != "linux" {
		return fmt.Errorf("源码安装仅支持 Linux，当前系统为 %s", runtime.GOOS)
	}
	if os.Geteuid() != 0 {
		return fmt.Errorf("安装 Nginx 需要 root 权限")
	}

	status.AddLog(fmt.Sprintf("=== 开始安装 Nginx %s (%s/%s) ===", opts.Version, runtime.GOOS, runtime.GOARCH))

	// 0) 预检：现有 nginx 若依赖第三方模块，直接替换会打断线上站点，必须先确认
	if reason := DetectThirdPartyModules(); reason != "" {
		if !opts.Force {
			return fmt.Errorf("现有 nginx 编译进了第三方模块（%s），官方源码构建不会包含它们，替换后原有站点可能无法加载。"+
				"确认要覆盖请带 force=true 重试，或改用发行版包管理器升级 nginx", reason)
		}
		status.AddLog("!!! 已确认强制覆盖，原有第三方模块将丢失: " + reason)
	}

	workDir := filepath.Join(model.BuildDir, opts.Version)
	if err := os.MkdirAll(workDir, 0o755); err != nil {
		return fmt.Errorf("创建工作目录失败: %w", err)
	}
	for _, dir := range []string{model.NginxLogDir, model.NginxCacheDir, "/usr/local/src"} {
		_ = os.MkdirAll(dir, 0o755)
	}

	tarball := filepath.Join(workDir, fmt.Sprintf("nginx-%s.tar.gz", opts.Version))
	sigFile := tarball + ".asc"
	srcDir := filepath.Join(workDir, fmt.Sprintf("nginx-%s", opts.Version))

	// 1) 系统依赖
	if !opts.SkipDependencies {
		if err := installBuildDependencies(ctx, status); err != nil {
			status.AddLog("!!! 依赖安装失败，继续尝试编译（若编译失败请手动安装 build-essential/libpcre2-dev/zlib1g-dev/libssl-dev）")
		}
	}

	// 2) 下载
	if err := downloadFile(ctx, status, fmt.Sprintf("%s/nginx-%s.tar.gz", nginxDownloadBase, opts.Version), tarball); err != nil {
		return err
	}
	_ = downloadFile(ctx, status, fmt.Sprintf("%s/nginx-%s.tar.gz.asc", nginxDownloadBase, opts.Version), sigFile)

	// 3) 完整性校验（强制）
	if err := verifyPinnedChecksum(status, opts.Version, tarball, opts.AllowUnpinned); err != nil {
		return err
	}

	// 4) PGP 验签（纵深防御，gpg 不可用时降级为告警）
	verifyPGP(status, tarball, sigFile)

	// 5) 解包
	status.AddLog(">>> 解压源码")
	_ = os.RemoveAll(srcDir)
	if err := executor.ExecuteCommand(ctx, status, "tar", "-xzf", tarball, "-C", workDir); err != nil {
		return fmt.Errorf("解压源码失败: %w", err)
	}
	if _, err := os.Stat(filepath.Join(srcDir, "configure")); err != nil {
		return fmt.Errorf("源码目录结构异常，未找到 configure: %w", err)
	}

	// 6) 备份现有配置与二进制，供失败回滚
	confBackup, hadConf := backupNginxConf(status)
	prevBinary, hadBinary := backupNginxBinary(status)

	// 7) configure + make + make install
	if err := configureNginx(ctx, status, srcDir); err != nil {
		return err
	}
	if err := executor.ExecuteCommandIn(ctx, status, srcDir, "make", "-j", strconv.Itoa(opts.Jobs)); err != nil {
		return fmt.Errorf("编译失败: %w", err)
	}
	status.AddLog(">>> 安装到系统路径")
	if err := executor.ExecuteCommandIn(ctx, status, srcDir, "make", "install"); err != nil {
		rollbackNginxBinary(status, prevBinary, hadBinary)
		return fmt.Errorf("安装失败: %w", err)
	}
	// 安装完成后 /etc/nginx 与 sbin 才真正存在，重新探测路径
	model.ResetPathCache()

	// make install 会覆盖 nginx.conf，用备份还原
	restoreNginxConf(status, confBackup, hadConf)
	// 全新安装时用本项目的硬化基线覆盖 tarball 默认配置（否则 sites-enabled 不会被加载）
	ensureBaseConfig(status, !hadConf)
	writeSystemdUnit(status)

	// 8) 校验并启动
	model.ResetPathCache()
	if out, err := executor.ExecuteSimple(model.SbinPath(), "-t"); err != nil {
		rollbackNginxBinary(status, prevBinary, hadBinary)
		return fmt.Errorf("配置校验失败，已回滚二进制: %s", strings.TrimSpace(out))
	}
	_, _ = executor.ExecuteSimple("systemctl", "daemon-reload")
	if _, err := executor.ExecuteSimple("systemctl", "reload-or-restart", "nginx"); err != nil {
		if _, startErr := executor.ExecuteSimple("systemctl", "start", "nginx"); startErr != nil {
			status.AddLog("!!! Nginx 启动失败，请检查 systemctl status nginx")
			return fmt.Errorf("启动 Nginx 失败: %w", err)
		}
	}
	_, _ = executor.ExecuteSimple("systemctl", "enable", "nginx")

	// 9) 后置校验
	installed, vErr := DetectInstalledVersion()
	if vErr != nil || installed != opts.Version {
		status.AddLog(fmt.Sprintf("!!! 期望版本 %s，实测 %s (%v)", opts.Version, installed, vErr))
	} else {
		status.AddLog(fmt.Sprintf("✅ Nginx %s 安装完成，校验通过", installed))
	}
	maybeWriteACMEIssuer(status)

	if hadBinary && prevBinary != "" {
		_ = os.Remove(prevBinary)
	}
	status.AddLog("=== 安装结束 ===")
	return nil
}

// detectThirdPartyModules 检查现有 nginx 是否带有非官方模块（acme / brotli / 任意 add-module）。
// 返回空字符串表示干净，可以安全替换。
func DetectThirdPartyModules() string {
	sbin := model.SbinPath()
	if _, err := os.Stat(sbin); err != nil {
		return "" // 还没装，无需预检
	}

	var found []string
	if out, err := executor.ExecuteSimple(sbin, "-V"); err == nil || out != "" {
		for _, marker := range []string{"--add-module", "--add-dynamic-module", "brotli", "acme"} {
			if strings.Contains(out, marker) {
				found = append(found, marker)
			}
		}
	}

	confFile := filepath.Join(model.ConfDir(), "nginx.conf")
	if data, err := os.ReadFile(confFile); err == nil && strings.Contains(string(data), "load_module") {
		found = append(found, "load_module(动态模块)")
	}

	return strings.Join(found, ", ")
}

func installBuildDependencies(ctx context.Context, status *executor.TaskStatus) error {
	type pkgSet struct {
		check string
		args  [][]string
	}

	candidates := []pkgSet{
		{
			check: "apt-get",
			args: [][]string{
				{"apt-get", "update", "-qq"},
				{"apt-get", "install", "-y", "--no-install-recommends",
					"build-essential", "libpcre2-dev", "zlib1g-dev", "libssl-dev",
					"ca-certificates", "curl", "gnupg", "tar"},
			},
		},
		{
			check: "dnf",
			args: [][]string{
				{"dnf", "install", "-y", "gcc", "gcc-c++", "make", "pcre2-devel",
					"zlib-devel", "openssl-devel", "ca-certificates", "curl", "gnupg2", "tar"},
			},
		},
		{
			check: "yum",
			args: [][]string{
				{"yum", "install", "-y", "gcc", "gcc-c++", "make", "pcre2-devel",
					"zlib-devel", "openssl-devel", "ca-certificates", "curl", "gnupg2", "tar"},
			},
		},
	}

	for _, set := range candidates {
		if _, err := exec.LookPath(set.check); err != nil {
			continue
		}
		status.AddLog(fmt.Sprintf(">>> 安装编译依赖（%s）", set.check))
		for _, args := range set.args {
			if err := executor.ExecuteCommand(ctx, status, args[0], args[1:]...); err != nil {
				return err
			}
		}
		return nil
	}
	return fmt.Errorf("未识别的包管理器，请手动安装编译依赖")
}

func downloadFile(ctx context.Context, status *executor.TaskStatus, url, dest string) error {
	status.AddLog(">>> 下载 " + url)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return err
	}
	client := &http.Client{Timeout: 10 * time.Minute}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("下载失败 %s: %w", url, err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("下载失败 %s: HTTP %d", url, resp.StatusCode)
	}

	tmp := dest + ".part"
	f, err := os.Create(tmp)
	if err != nil {
		return err
	}
	if _, err := io.Copy(f, resp.Body); err != nil {
		f.Close()
		os.Remove(tmp)
		return fmt.Errorf("写入文件失败: %w", err)
	}
	if err := f.Close(); err != nil {
		os.Remove(tmp)
		return err
	}
	return os.Rename(tmp, dest)
}

func fileSHA256(path string) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer f.Close()
	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return "", err
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}

func verifyPinnedChecksum(status *executor.TaskStatus, version, path string, allowUnpinned bool) error {
	status.AddLog(">>> 校验源码完整性 (SHA-256)")
	actual, err := fileSHA256(path)
	if err != nil {
		return fmt.Errorf("计算校验值失败: %w", err)
	}
	expected, pinned := pinnedNginxSources[version]
	if !pinned {
		if !allowUnpinned {
			return fmt.Errorf("版本 %s 没有内嵌校验值，已拒绝安装。如需强制安装请显式允许未固定版本", version)
		}
		status.AddLog(fmt.Sprintf("!!! 警告: 版本 %s 未固定校验值，实际 SHA-256 = %s", version, actual))
		return nil
	}
	if !strings.EqualFold(actual, expected) {
		_ = os.Remove(path)
		return fmt.Errorf("源码校验失败: 期望 %s，实际 %s（文件已删除）", expected, actual)
	}
	status.AddLog("✅ SHA-256 匹配: " + actual)
	return nil
}

func verifyPGP(status *executor.TaskStatus, tarball, sigFile string) {
	if _, err := os.Stat(sigFile); err != nil {
		status.AddLog("!!! 未获取到官方签名文件，跳过 PGP 验签")
		return
	}
	if _, err := exec.LookPath("gpg"); err != nil {
		status.AddLog("!!! 系统无 gpg，跳过 PGP 验签（SHA-256 校验已通过）")
		return
	}

	status.AddLog(">>> PGP 验签")
	script := fmt.Sprintf(`set -u
export GNUPGHOME="$(mktemp -d)"
trap 'rm -rf "$GNUPGHOME"' EXIT
for k in nginx_signing arut pluknet sb thresh; do
  curl -fsSL --max-time 30 "%s/$k.key" 2>/dev/null | gpg --batch --quiet --import 2>/dev/null || true
done
if ! gpg --batch --list-keys >/dev/null 2>&1; then
  echo "NO_KEY"; exit 0
fi
gpg --batch --verify "%s" "%s" 2>&1 | tail -5
`, nginxKeysBase, sigFile, tarball)

	out, err := executor.ExecuteSimple("bash", "-c", script)
	if err != nil {
		status.AddLog("!!! PGP 验签未通过: " + strings.TrimSpace(out))
		return
	}
	if strings.Contains(out, "Good signature") {
		status.AddLog("✅ PGP 签名有效")
		return
	}
	status.AddLog("!!! PGP 验签未完成（公钥不可用），依赖 SHA-256 校验结果")
}

// nginx 模块集：开启面板需要的功能，同时不编译 dav/mp4 等易出问题的模块。
func nginxConfigureArgs(confDir string) []string {
	return []string{
		"--prefix=" + model.NginxPrefix,
		"--sbin-path=" + model.NginxSbinPath,
		"--conf-path=" + filepath.Join(confDir, "nginx.conf"),
		"--pid-path=" + filepath.Join(model.NginxPidDir, "nginx.pid"),
		"--lock-path=" + filepath.Join(model.NginxPidDir, "nginx.lock"),
		"--http-log-path=" + filepath.Join(model.NginxLogDir, "access.log"),
		"--error-log-path=" + filepath.Join(model.NginxLogDir, "error.log"),
		"--http-client-body-temp-path=" + filepath.Join(model.NginxCacheDir, "client_temp"),
		"--http-proxy-temp-path=" + filepath.Join(model.NginxCacheDir, "proxy_temp"),
		"--http-fastcgi-temp-path=" + filepath.Join(model.NginxCacheDir, "fastcgi_temp"),
		"--http-uwsgi-temp-path=" + filepath.Join(model.NginxCacheDir, "uwsgi_temp"),
		"--http-scgi-temp-path=" + filepath.Join(model.NginxCacheDir, "scgi_temp"),
		"--user=" + model.NginxUser,
		"--group=" + model.NginxGroup,
		"--with-compat",
		"--with-threads",
		"--with-file-aio",
		"--with-http_ssl_module",
		"--with-http_v2_module",
		"--with-http_realip_module",
		"--with-http_sub_module",
		"--with-http_addition_module",
		"--with-http_gzip_static_module",
		"--with-http_stub_status_module",
		"--with-http_auth_request_module",
		"--with-http_secure_link_module",
		"--with-http_slice_module",
		"--with-stream",
		"--with-stream_ssl_module",
		"--with-stream_realip_module",
		"--with-stream_ssl_preread_module",
		"--with-cc-opt=-O2 -pipe -fstack-protector-strong -fstack-clash-protection -D_FORTIFY_SOURCE=3 -fPIE -Wformat -Werror=format-security",
		"--with-ld-opt=-Wl,-z,relro -Wl,-z,now -pie -Wl,--as-needed",
	}
}

func configureNginx(ctx context.Context, status *executor.TaskStatus, srcDir string) error {
	confDir := model.ConfDir()
	base := nginxConfigureArgs(confDir)

	// ACME 模块只在较新分支提供；优先带上，失败则退回标准模块集。
	withACME := append(append([]string{}, base...), "--with-http_acme_module")

	status.AddLog(">>> configure（硬化编译参数 + ACME 模块）")
	if err := executor.ExecuteCommandIn(ctx, status, srcDir, "./configure", withACME...); err == nil {
		return nil
	}
	status.AddLog("!!! ACME 模块不可用，改用标准模块集重试")
	if err := executor.ExecuteCommandIn(ctx, status, srcDir, "./configure", base...); err != nil {
		return fmt.Errorf("configure 失败: %w", err)
	}
	return nil
}

func backupNginxConf(status *executor.TaskStatus) (string, bool) {
	confDir := model.ConfDir()
	confFile := filepath.Join(confDir, "nginx.conf")
	if _, err := os.Stat(confFile); err != nil {
		return "", false
	}
	backupDir := "/root/nginx_backups"
	_ = os.MkdirAll(backupDir, 0o755)
	backup := filepath.Join(backupDir, fmt.Sprintf("pre-upgrade-%s.tar.gz", time.Now().Format("20060102_150405")))
	if _, err := executor.ExecuteSimple("tar", "-czf", backup, "-C", "/", strings.TrimPrefix(confDir, "/")); err != nil {
		status.AddLog("!!! 配置备份失败，继续安装（make install 可能覆盖 nginx.conf）")
		return "", false
	}
	status.AddLog("✅ 已备份现有配置: " + backup)
	return backup, true
}

func restoreNginxConf(status *executor.TaskStatus, backup string, existed bool) {
	if !existed || backup == "" {
		return
	}
	confDir := model.ConfDir()
	tmp, err := os.MkdirTemp("", "nginx-conf-restore")
	if err != nil {
		status.AddLog("!!! 配置还原失败: " + err.Error())
		return
	}
	defer os.RemoveAll(tmp)
	if _, err := executor.ExecuteSimple("tar", "-xzf", backup, "-C", tmp); err != nil {
		status.AddLog("!!! 配置还原失败: " + err.Error())
		return
	}
	// 备份内保留了绝对目录结构，回拷时只覆盖 nginx.conf，避免冲掉新装的 mime.types 等文件。
	relative := strings.TrimPrefix(confDir, "/")
	src := filepath.Join(tmp, relative, "nginx.conf")
	if _, err := os.Stat(src); err != nil {
		status.AddLog("!!! 未找到备份中的 nginx.conf，保留新装默认配置")
		return
	}
	content, err := os.ReadFile(src)
	if err != nil {
		status.AddLog("!!! 读取备份配置失败: " + err.Error())
		return
	}
	if err := os.WriteFile(filepath.Join(confDir, "nginx.conf"), content, 0o644); err != nil {
		status.AddLog("!!! 写回 nginx.conf 失败: " + err.Error())
		return
	}
	status.AddLog("✅ 已还原原有 nginx.conf")
}

func backupNginxBinary(status *executor.TaskStatus) (string, bool) {
	sbin := model.SbinPath()
	if _, err := os.Stat(sbin); err != nil {
		return "", false
	}
	prev := sbin + ".prev"
	if err := copyFile(sbin, prev); err != nil {
		status.AddLog("!!! 备份旧二进制失败: " + err.Error())
		return "", false
	}
	status.AddLog("✅ 已备份旧二进制: " + prev)
	return prev, true
}

func rollbackNginxBinary(status *executor.TaskStatus, prev string, existed bool) {
	if !existed || prev == "" {
		return
	}
	sbin := model.SbinPath()
	if err := copyFile(prev, sbin); err != nil {
		status.AddLog("!!! 回滚二进制失败: " + err.Error())
		return
	}
	_ = os.Chmod(sbin, 0o755)
	_, _ = executor.ExecuteSimple("systemctl", "reload-or-restart", "nginx")
	status.AddLog("↩️ 已回滚到升级前的 nginx 二进制")
}

func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	out, err := os.OpenFile(dst, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o755)
	if err != nil {
		return err
	}
	if _, err := io.Copy(out, in); err != nil {
		out.Close()
		return err
	}
	return out.Close()
}

// ensureBaseConfig 在全新安装时写入本项目的基础配置。
// force=false 时只在文件缺失时生成，避免覆盖线上已有配置。
func ensureBaseConfig(status *executor.TaskStatus, force bool) {
	confDir := model.ConfDir()
	confFile := filepath.Join(confDir, "nginx.conf")
	if !force {
		if content, err := os.ReadFile(confFile); err == nil {
			// 已有配置但没有引入站点目录时给出提示，不擅自改动
			if !strings.Contains(string(content), "sites-enabled") {
				status.AddLog("!!! 现有 nginx.conf 未 include sites-enabled/*，面板创建的站点不会生效，请手动添加")
			}
			return
		}
	}
	_ = os.MkdirAll(filepath.Join(confDir, "conf.d"), 0o755)
	_ = os.MkdirAll(filepath.Join(confDir, "sites-available"), 0o755)
	_ = os.MkdirAll(filepath.Join(confDir, "sites-enabled"), 0o755)

	base := `# 由 ngx-nova 生成的基础配置（硬化基线）
user  ` + model.NginxUser + ` ` + model.NginxGroup + `;
worker_processes  auto;
pid        ` + filepath.Join(model.NginxPidDir, "nginx.pid") + `;
error_log  ` + filepath.Join(model.NginxLogDir, "error.log") + ` warn;

events {
    worker_connections  4096;
    multi_accept        on;
}

http {
    include       mime.types;
    default_type  application/octet-stream;

    # 隐藏版本号，避免信息泄露
    server_tokens off;

    # TLS 会话缓存：shared:SSL 这个共享内存区全份配置只能声明一次，
    # 站点模板不再注入该指令，避免与本站尺寸不一致时 nginx -t 直接 emerg。
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 1d;

    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for" "$host"';

    access_log  ` + filepath.Join(model.NginxLogDir, "access.log") + `  main buffer=64k flush=10s;

    sendfile        on;
    tcp_nopush      on;
    keepalive_timeout  65;
    client_max_body_size 100m;

    # 缓解慢速攻击：限制单连接读写时间与请求头尺寸
    client_header_timeout 15s;
    client_body_timeout   30s;
    send_timeout          30s;
    large_client_header_buffers 4 16k;

    gzip  on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript
               application/xml image/svg+xml;

    # 站点模板会引用 my_proxy_cache，必须在这里定义缓存区，否则 nginx -t 报错
    proxy_cache_path /var/cache/nginx/proxy_cache levels=1:2
                     keys_zone=my_proxy_cache:100m
                     max_size=10g inactive=60m use_temp_path=off;

    include conf.d/*.conf;
    include sites-enabled/*;
}
`
	if err := os.WriteFile(confFile, []byte(base), 0o644); err != nil {
		status.AddLog("!!! 写入基础配置失败: " + err.Error())
		return
	}
	status.AddLog("✅ 已生成硬化基础配置: " + confFile)
}

func writeSystemdUnit(status *executor.TaskStatus) {
	sbin := model.SbinPath()
	unit := `[Unit]
Description=nginx (ngx-nova hardened build)
Documentation=https://nginx.org/en/docs/
After=network-online.target remote-fs.target nss-lookup.target
Wants=network-online.target

[Service]
Type=forking
PIDFile=` + filepath.Join(model.NginxPidDir, "nginx.pid") + `
ExecStartPre=` + sbin + ` -t -q -g 'daemon on; master_process on;'
ExecStart=` + sbin + ` -g 'daemon on; master_process on;'
ExecReload=` + sbin + ` -g 'daemon on; master_process on;' -s reload
ExecStop=/bin/kill -s QUIT $MAINPID
TimeoutStopSec=10
KillMode=mixed
Restart=on-failure
RestartSec=3s
LimitNOFILE=1048576
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
`
	if _, err := os.Stat(nginxUnitPath); err == nil {
		return // 已有 unit 不覆盖，避免打乱用户自定义
	}
	if err := os.WriteFile(nginxUnitPath, []byte(unit), 0o644); err != nil {
		status.AddLog("!!! 写入 systemd unit 失败: " + err.Error())
		return
	}
	status.AddLog("✅ 已写入 systemd unit: " + nginxUnitPath)
}

// ACME 模块可用时补一份 issuer 配置，站点模板里的 acme_certificate 才能通过 nginx -t。
func maybeWriteACMEIssuer(status *executor.TaskStatus) {
	out, err := executor.ExecuteSimple(model.SbinPath(), "-V")
	if err != nil || !strings.Contains(out, "http_acme_module") {
		return
	}
	confDir := model.ConfDir()
	target := filepath.Join(confDir, "conf.d", "00-acme-issuer.conf")
	if _, err := os.Stat(target); err == nil {
		return
	}
	_ = os.MkdirAll(filepath.Join(confDir, "conf.d"), 0o755)
	_ = os.MkdirAll(filepath.Join(confDir, "acme"), 0o755)
	content := `acme_issuer letsencrypt {
    uri              https://acme-v02.api.letsencrypt.org/directory;
    state_path       ` + filepath.Join(confDir, "acme") + `;
    accept_terms_of_service;
}
`
	if err := os.WriteFile(target, []byte(content), 0o644); err != nil {
		status.AddLog("!!! 写入 ACME issuer 配置失败: " + err.Error())
		return
	}
	status.AddLog("✅ 已写入 ACME issuer: " + target)
}
