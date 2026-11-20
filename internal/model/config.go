package model

// Nginx 版本基线。
// 数值来源: https://nginx.org/en/download.html 与 security_advisories.html，
// 由 scripts/gen_advisories.py 从官方公告页推导，勿手工下调。
const (
	// NginxStableVersion 为当前 stable 分支的最新修复版本。
	NginxStableVersion = "1.30.7"
	// NginxMainlineVersion 为当前 mainline 分支的最新修复版本。
	NginxMainlineVersion = "1.31.9"
	// NginxVersion 保留为默认安装目标（stable 通道），供面板默认安装使用。
	NginxVersion = NginxStableVersion
)

// 目录布局（老版本 nginx-acme 脚本与发行版包都兼容）。
const (
	NginxPrefix   = "/usr/local/nginx"
	BuildDir      = "/usr/local/src/nginx-build"
	NginxConfDir  = "/etc/nginx"
	NginxSbinPath = "/usr/sbin/nginx"
	NginxUser     = "www-data"
	NginxGroup    = "www-data"
	NginxLogDir   = "/var/log/nginx"
	NginxCacheDir = "/var/cache/nginx"
	NginxPidDir   = "/run"
)

type SiteConfig struct {
	Domain      string   `json:"domain"`
	Type        string   `json:"type"` // proxy, static, lb, redirect
	BackendIP   string   `json:"backend_ip"`
	BackendPort int      `json:"backend_port"`
	Backends    []string `json:"backends"`   // For LB
	TargetURL   string   `json:"target_url"` // For redirect
}

// TLSHardening 生成站点模板共用的 TLS / 响应头安全基线。
// 说明：
//   - 只允许 TLS1.2/1.3，关闭 session ticket，规避 ticket 密钥复用类问题；
//   - server_tokens off 隐藏版本号，避免按版本号定点利用；
//   - HSTS 不带 includeSubDomains / preload，避免误伤同域下未启用 HTTPS 的子域；
//   - 这里刻意不写 ssl_session_cache / ssl_session_timeout：同名共享内存区
//     （shared:SSL）整份配置只能声明一次，尺寸必须处处一致。站点级再声明一次，
//     一旦主配置用了别的尺寸（例如 30m），nginx -t 直接
//     `[emerg] the size ... conflicts with already declared size ...`，
//     面板每次建站都会失败。会话缓存统一由 http{} 基线声明，见
//     internal/service/nginx_build.go 与 docker/nginx.conf。
const TLSHardening = `    # ===== 安全基线（ngx-nova 自动注入）=====
    server_tokens off;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_tickets off;

    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options SAMEORIGIN always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    add_header Strict-Transport-Security "max-age=31536000" always;
`

// TLSHardeningBlock 供模板以 {{.TLSHardening}} 形式调用。
func (c SiteConfig) TLSHardening() string { return TLSHardening }

// Brotli 供模板判断是否输出 brotli 指令：二进制未编译该模块时，
// 一旦写进站点配置 nginx -t 会直接失败，所以按实际能力渲染。
func (c SiteConfig) Brotli() bool { return BrotliEnabled() }

// ACME 供模板判断是否使用 acme_certificate 指令（需要第三方 ACME 模块）。
func (c SiteConfig) ACME() bool { return ACMEEnabled() }

// SSLDir 返回自管证书目录，用于没有 ACME 模块时的证书路径。
func (c SiteConfig) SSLDir() string { return ConfDir() + "/ssl" }

type StreamConfig struct {
	Name       string `json:"name"`
	ListenPort int    `json:"listen_port"`
	Target     string `json:"target"` // IP:PORT
}
