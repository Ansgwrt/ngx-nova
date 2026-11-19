package model

import (
	"os"
	"os/exec"
	"strings"
	"sync"
	"sync/atomic"
)

// nginx 的实际落盘位置随安装方式不同而不同：
//   - 发行版包 / nginx-acme 脚本: /usr/sbin/nginx + /etc/nginx
//   - 源码编译 (本面板):          /usr/local/nginx/sbin/nginx + /usr/local/nginx/conf
//
// 早期版本把 /usr/sbin/nginx 硬编码在所有调用点，源码安装后所有命令都会失败，
// 因此这里统一做一次探测并缓存，安装/卸载后调用 ResetPathCache 强制重新探测。
var (
	pathMu   sync.RWMutex
	sbin     string
	confDir  string
	resolved bool
)

// ResetPathCache 在安装、卸载、升级之后调用，让下一次探测重新读盘。
func ResetPathCache() {
	pathMu.Lock()
	sbin, confDir, resolved = "", "", false
	pathMu.Unlock()
}

func resolvePaths() {
	pathMu.Lock()
	defer pathMu.Unlock()
	if resolved {
		return
	}

	sbin = detectSbin()
	confDir = detectConfDir(sbin)
	resolved = true
}

func detectSbin() string {
	if v := os.Getenv("NGX_SBIN"); v != "" {
		if _, err := os.Stat(v); err == nil {
			return v
		}
	}
	for _, candidate := range []string{
		NginxSbinPath,
		NginxPrefix + "/sbin/nginx",
		"/usr/local/sbin/nginx",
		"/usr/local/bin/nginx",
	} {
		if info, err := os.Stat(candidate); err == nil && !info.IsDir() {
			return candidate
		}
	}
	if p, err := exec.LookPath("nginx"); err == nil {
		return p
	}
	return NginxSbinPath
}

func detectConfDir(sbin string) string {
	if v := os.Getenv("NGX_CONF_DIR"); v != "" {
		if info, err := os.Stat(v); err == nil && info.IsDir() {
			return v
		}
	}
	// 源码安装时 conf 与 bin 同级放在 prefix 下，优先跟随实际二进制。
	if sbin != "" {
		prefixConf := NginxPrefix + "/conf"
		if info, err := os.Stat(prefixConf); err == nil && info.IsDir() {
			if _, err := os.Stat(NginxConfDir + "/nginx.conf"); err != nil {
				return prefixConf
			}
		}
	}
	if info, err := os.Stat(NginxConfDir); err == nil && info.IsDir() {
		return NginxConfDir
	}
	if info, err := os.Stat(NginxPrefix + "/conf"); err == nil && info.IsDir() {
		return NginxPrefix + "/conf"
	}
	return NginxConfDir
}

// SbinPath 返回探测到的 nginx 可执行文件路径。
func SbinPath() string {
	resolvePaths()
	pathMu.RLock()
	defer pathMu.RUnlock()
	return sbin
}

// ConfDir 返回探测到的 nginx 配置目录。
func ConfDir() string {
	resolvePaths()
	pathMu.RLock()
	defer pathMu.RUnlock()
	return confDir
}

var (
	brotliEnabled atomic.Bool
	acmeEnabled   atomic.Bool
)

// DetectNginxFeatures 解析 nginx 的编译参数与主配置，决定站点模板能否使用 brotli / acme 指令。
// 模板里如果写了二进制不支持的指令，nginx -t 会直接失败，所以必须先探测再渲染。
func DetectNginxFeatures() {
	out, err := exec.Command(SbinPath(), "-V").CombinedOutput()
	if err != nil && len(out) == 0 {
		brotliEnabled.Store(false)
		acmeEnabled.Store(false)
		return
	}
	text := strings.ToLower(string(out))
	brotliEnabled.Store(strings.Contains(text, "brotli"))

	acme := strings.Contains(text, "http_acme_module")
	if !acme {
		// 以 load_module 动态加载的模块不会出现在 -V 里，只能查主配置
		acme = acmeLoadedFromConfig(ConfDir())
	}
	acmeEnabled.Store(acme)
}

// acmeLoadedFromConfig 判断主配置是否通过 load_module 加载了 ACME 模块。
func acmeLoadedFromConfig(confDir string) bool {
	data, err := os.ReadFile(confDir + "/nginx.conf")
	if err != nil {
		return false
	}
	for _, line := range strings.Split(strings.ToLower(string(data)), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue // 注释掉的 load_module 不算
		}
		if strings.Contains(line, "load_module") && strings.Contains(line, "acme") {
			return true
		}
	}
	return false
}

// BrotliEnabled 报告当前 nginx 是否带 brotli 模块。
func BrotliEnabled() bool { return brotliEnabled.Load() }

// ACMEEnabled 报告当前 nginx 是否带 ACME 模块。
func ACMEEnabled() bool { return acmeEnabled.Load() }
