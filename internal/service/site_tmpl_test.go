package service

import (
	"bytes"
	"nginx-mgr/internal/model"
	"strings"
	"testing"
	"text/template"
)

// 站点模板是安全基线的落地点，任何一次改动都必须保证加固片段仍然渲染出来。
func TestSiteTemplatesRenderHardening(t *testing.T) {
	cfg := model.SiteConfig{
		Domain:      "example.com",
		Type:        "proxy",
		BackendIP:   "127.0.0.1",
		BackendPort: 8080,
		Backends:    []string{"10.0.0.1:80", "10.0.0.2:80"},
		TargetURL:   "https://new.example.com",
	}

	funcMap := template.FuncMap{
		"replace": strings.ReplaceAll,
	}

	required := []string{
		"server_tokens off;",
		"ssl_protocols TLSv1.2 TLSv1.3;",
		"ssl_session_tickets off;",
		"X-Content-Type-Options nosniff always",
		"Strict-Transport-Security",
		"example.com",
	}

	for _, name := range []string{"proxy.tmpl", "static.tmpl", "lb.tmpl", "redirect.tmpl"} {
		tmpl, err := template.New(name).Funcs(funcMap).ParseFS(templateFS, "templates/"+name)
		if err != nil {
			t.Fatalf("%s 解析失败: %v", name, err)
		}
		var buf bytes.Buffer
		if err := tmpl.Execute(&buf, cfg); err != nil {
			t.Fatalf("%s 渲染失败: %v", name, err)
		}
		out := buf.String()
		for _, want := range required {
			if !strings.Contains(out, want) {
				t.Errorf("%s 输出缺少 %q", name, want)
			}
		}
		// 二进制没有 brotli 模块时不能渲染 brotli 指令，否则 nginx -t 直接失败
		if !model.BrotliEnabled() && strings.Contains(out, "brotli on;") {
			t.Errorf("%s 在未编译 brotli 模块时仍输出了 brotli 指令", name)
		}
		// 回归：站点配置里不允许出现 ssl_session_cache。
		// 同名共享内存区（shared:SSL）整份配置只能声明一次且尺寸一致，
		// 站点级重复声明会和主配置撞尺寸，nginx -t 报
		// "[emerg] the size ... conflicts with already declared size ..."。
		if strings.Contains(out, "ssl_session_cache") {
			t.Errorf("%s 在站点配置里声明了 ssl_session_cache，会与 http{} 的同名 zone 冲突", name)
		}
	}
}

func TestStreamTemplateRender(t *testing.T) {
	tmpl, err := template.New("stream.tmpl").ParseFS(templateFS, "templates/stream.tmpl")
	if err != nil {
		t.Fatalf("stream 模板解析失败: %v", err)
	}
	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, model.StreamConfig{Name: "db", ListenPort: 3306, Target: "10.0.0.5:3306"}); err != nil {
		t.Fatalf("stream 模板渲染失败: %v", err)
	}
	if !strings.Contains(buf.String(), "listen 3306;") {
		t.Errorf("stream 模板输出异常: %s", buf.String())
	}
}
