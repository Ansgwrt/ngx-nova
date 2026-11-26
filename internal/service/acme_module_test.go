package service

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// 主配置补丁必须幂等：重复跑不会重复插入 load_module / resolver / 共享内存区。
func TestPatchACMEConfIdempotent(t *testing.T) {
	dir := t.TempDir()
	conf := filepath.Join(dir, "nginx.conf")
	base := `user  www-data www-data;
worker_processes  auto;

events {
    worker_connections  4096;
}

http {
    include       mime.types;
    ssl_session_cache   shared:SSL:10m;
    include conf.d/*.conf;
    include sites-enabled/*;
}
`
	if err := os.WriteFile(conf, []byte(base), 0o644); err != nil {
		t.Fatal(err)
	}

	changed, err := patchACMEConf(conf)
	if err != nil {
		t.Fatalf("首次补丁失败: %v", err)
	}
	if !changed {
		t.Fatal("首次补丁应发生改动")
	}
	once, _ := os.ReadFile(conf)
	text := string(once)

	if !strings.HasPrefix(text, acmeLoadModuleLine) {
		t.Errorf("load_module 应在文件首行，实际: %q", firstLine(text))
	}
	if strings.Count(text, "acme_shared_zone") != 1 {
		t.Errorf("acme_shared_zone 应恰好出现 1 次，实际 %d", strings.Count(text, "acme_shared_zone"))
	}
	if strings.Count(text, "resolver ") != 1 {
		t.Errorf("resolver 应恰好出现 1 次，实际 %d", strings.Count(text, "resolver "))
	}
	// 注入点必须在 http{} 内部，而不是 events{} 里
	httpIdx := strings.Index(text, "http {")
	for _, key := range []string{"acme_shared_zone", "resolver "} {
		if i := strings.Index(text, key); i < httpIdx {
			t.Errorf("%s 被插到了 http{} 之外", key)
		}
	}

	again, err := patchACMEConf(conf)
	if err != nil {
		t.Fatalf("二次补丁失败: %v", err)
	}
	if again {
		t.Error("二次补丁不应再有改动（非幂等）")
	}
	twice, _ := os.ReadFile(conf)
	if string(twice) != text {
		t.Error("二次补丁改动了文件内容")
	}
}

// 已有 resolver 时不要覆盖用户的 DNS 设置。
func TestPatchACMEConfKeepsUserResolver(t *testing.T) {
	dir := t.TempDir()
	conf := filepath.Join(dir, "nginx.conf")
	base := "events {\n}\n\nhttp {\n    resolver 223.5.5.5;\n}\n"
	if err := os.WriteFile(conf, []byte(base), 0o644); err != nil {
		t.Fatal(err)
	}
	if _, err := patchACMEConf(conf); err != nil {
		t.Fatalf("补丁失败: %v", err)
	}
	data, _ := os.ReadFile(conf)
	text := string(data)
	if strings.Contains(text, "1.1.1.1 8.8.8.8") {
		t.Error("不应覆盖用户已有的 resolver")
	}
	if !strings.Contains(text, "resolver 223.5.5.5;") {
		t.Error("用户 resolver 丢失")
	}
	if !strings.Contains(text, acmeLoadModuleLine) {
		t.Error("load_module 未写入")
	}
}

// issuer 配置必须指向 state_path 与 Let's Encrypt 目录，否则模块签发失败。
func TestACMEIssuerContent(t *testing.T) {
	got := acmeIssuerContent("/etc/nginx")
	if !strings.Contains(got, "acme_issuer letsencrypt {") {
		t.Error("缺少 acme_issuer 定义")
	}
	if !strings.Contains(got, "https://acme-v02.api.letsencrypt.org/directory") {
		t.Error("缺少 Let's Encrypt directory URL")
	}
	if !strings.Contains(got, "/etc/nginx/acme") {
		t.Error("state_path 未指向 <conf>/acme")
	}
	if !strings.Contains(got, "accept_terms_of_service;") {
		t.Error("缺少 accept_terms_of_service")
	}
}

func firstLine(s string) string {
	if i := strings.IndexByte(s, '\n'); i >= 0 {
		return s[:i]
	}
	return s
}
