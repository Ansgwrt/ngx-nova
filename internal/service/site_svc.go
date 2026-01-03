package service

import (
	"embed"
	"fmt"
	"nginx-mgr/internal/model"
	"os"
	"path/filepath"
	"strings"
	"text/template"
)

//go:embed templates/*.tmpl
var templateFS embed.FS

type SiteService struct {
	ConfDir string
}

func NewSiteService() *SiteService {
	return &SiteService{
		ConfDir: model.NginxConfDir,
	}
}

func (s *SiteService) CreateSite(config model.SiteConfig) error {
	var tmplName string
	switch config.Type {
	case "proxy":
		tmplName = "proxy.tmpl"
	case "static":
		tmplName = "static.tmpl"
		// 创建静态目录
		os.MkdirAll(filepath.Join("/var/www/html", config.Domain), 0755)
	case "lb":
		tmplName = "lb.tmpl"
	case "redirect":
		tmplName = "redirect.tmpl"
	default:
		return fmt.Errorf("不支持的站点类型: %s", config.Type)
	}

	funcMap := template.FuncMap{
		"replace": func(old, new, src string) string {
			return strings.ReplaceAll(src, old, new)
		},
	}

	tmpl, err := template.New(tmplName).Funcs(funcMap).ParseFS(templateFS, "templates/"+tmplName)
	if err != nil {
		return err
	}

	availablePath := s.availablePath(config.Domain)
	f, err := os.Create(availablePath)
	if err != nil {
		return err
	}
	defer f.Close()

	if err := tmpl.Execute(f, config); err != nil {
		return err
	}

	// 默认启用站点
	enabledPath := s.enabledPath(config.Domain)
	// 如果已存在则先删除
	os.Remove(enabledPath)
	return os.Symlink(availablePath, enabledPath)
}

func (s *SiteService) DeleteSite(domain string) error {
	enabledPath := s.enabledPath(domain)
	availablePath := s.availablePath(domain)

	os.Remove(enabledPath)
	return os.Remove(availablePath)
}

func (s *SiteService) GetSite(domain string) (*model.SiteConfig, error) {
	content, err := s.ReadSiteRaw(domain)
	if err != nil {
		return nil, err
	}

	config := &model.SiteConfig{Domain: domain}
	strContent := content
	if t := extractSiteType(strContent); t != "" {
		config.Type = t
		switch t {
		case "lb":
			parseLoadBalancers(strContent, config)
		case "proxy":
			parseProxyBackend(strContent, config)
		case "redirect":
			parseRedirectTarget(strContent, config)
		default:
			config.Type = "static"
		}
		return config, nil
	}

	if strings.Contains(strContent, "proxy_pass") {
		if strings.Contains(strContent, "upstream") {
			config.Type = "lb"
			parseLoadBalancers(strContent, config)
		} else {
			config.Type = "proxy"
			parseProxyBackend(strContent, config)
		}
	} else if strings.Contains(strContent, "return 301") {
		config.Type = "redirect"
		parseRedirectTarget(strContent, config)
	} else {
		config.Type = "static"
	}

	return config, nil
}

func (s *SiteService) ListSites() ([]string, error) {
	files, err := os.ReadDir(filepath.Join(s.ConfDir, "sites-available"))
	if err != nil {
		return nil, err
	}
	var sites []string
	for _, f := range files {
		sites = append(sites, f.Name())
	}
	return sites, nil
}

func (s *SiteService) availablePath(domain string) string {
	return filepath.Join(s.ConfDir, "sites-available", domain)
}

func (s *SiteService) enabledPath(domain string) string {
	return filepath.Join(s.ConfDir, "sites-enabled", domain)
}

func (s *SiteService) ReadSiteRaw(domain string) (string, error) {
	content, err := os.ReadFile(s.availablePath(domain))
	if err != nil {
		return "", err
	}
	return string(content), nil
}

func (s *SiteService) WriteSiteRaw(domain, content string) error {
	return os.WriteFile(s.availablePath(domain), []byte(content), 0644)
}

func (s *SiteService) RestoreSiteRaw(domain, content string) error {
	availablePath := s.availablePath(domain)
	if err := os.MkdirAll(filepath.Dir(availablePath), 0755); err != nil {
		return err
	}
	if err := os.WriteFile(availablePath, []byte(content), 0644); err != nil {
		return err
	}
	enabledPath := s.enabledPath(domain)
	os.Remove(enabledPath)
	return os.Symlink(availablePath, enabledPath)
}

func (s *SiteService) ListSiteConfigs() ([]model.SiteConfig, error) {
	domains, err := s.ListSites()
	if err != nil {
		return nil, err
	}
	configs := make([]model.SiteConfig, 0, len(domains))
	for _, domain := range domains {
		cfg, err := s.GetSite(domain)
		if err != nil {
			return nil, err
		}
		configs = append(configs, *cfg)
	}
	return configs, nil
}

func extractSiteType(content string) string {
	lines := strings.Split(content, "\n")
	for _, line := range lines {
		trim := strings.TrimSpace(line)
		if strings.HasPrefix(trim, "#") && strings.Contains(trim, "site_type:") {
			parts := strings.SplitN(trim, "site_type:", 2)
			if len(parts) == 2 {
				return strings.TrimSpace(parts[1])
			}
		}
	}
	return ""
}

func parseLoadBalancers(content string, config *model.SiteConfig) {
	lines := strings.Split(content, "\n")
	config.Backends = config.Backends[:0]
	for _, line := range lines {
		trim := strings.TrimSpace(line)
		if strings.HasPrefix(trim, "server ") && strings.HasSuffix(trim, ";") {
			addr := strings.TrimSuffix(strings.TrimPrefix(trim, "server "), ";")
			if addr != "" {
				config.Backends = append(config.Backends, addr)
			}
		}
	}
}

func parseProxyBackend(content string, config *model.SiteConfig) {
	idx := strings.Index(content, "proxy_pass http://")
	if idx == -1 {
		return
	}
	part := content[idx+len("proxy_pass http://"):]
	endIdx := strings.Index(part, ";")
	if endIdx == -1 {
		return
	}
	addr := part[:endIdx]
	parts := strings.Split(addr, ":")
	if len(parts) > 0 {
		config.BackendIP = parts[0]
	}
	if len(parts) > 1 {
		fmt.Sscanf(parts[1], "%d", &config.BackendPort)
	}
}

func parseRedirectTarget(content string, config *model.SiteConfig) {
	idx := strings.Index(content, "return 301 ")
	if idx == -1 {
		return
	}
	part := content[idx+len("return 301 "):]
	endIdx := strings.Index(part, ";")
	if endIdx == -1 {
		return
	}
	config.TargetURL = part[:endIdx]
}
