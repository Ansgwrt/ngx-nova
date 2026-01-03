package model

const (
	NginxPrefix      = "/usr/local/nginx"
	BuildDir         = "/usr/local/src/nginx-build"
	NginxVersion     = "1.28.0"
	NginxConfDir     = "/etc/nginx"
	NginxSbinPath    = "/usr/sbin/nginx"
	NginxUser        = "www-data"
	NginxGroup       = "www-data"
	NginxLogDir      = "/var/log/nginx"
	NginxCacheDir    = "/var/cache/nginx"
	NginxPidDir      = "/run"
)

type SiteConfig struct {
	Domain      string   `json:"domain"`
	Type        string   `json:"type"` // proxy, static, lb, redirect
	BackendIP   string   `json:"backend_ip"`
	BackendPort int      `json:"backend_port"`
	Backends    []string `json:"backends"`   // For LB
	TargetURL   string   `json:"target_url"` // For redirect
}

type StreamConfig struct {
	Name       string `json:"name"`
	ListenPort int    `json:"listen_port"`
	Target     string `json:"target"` // IP:PORT
}
