package service

import (
	"crypto/tls"
	"crypto/x509"
	"nginx-mgr/internal/model"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

// 域名会被直接拼进文件路径与站点文件名，任何能逃出配置目录的字符都必须被拒绝。
func TestValidateDomain(t *testing.T) {
	ok := []string{"example.com", "sub.example.com", "*.example.com", "a-b.co", "xn--fiqs8s.cn"}
	for _, d := range ok {
		if err := ValidateDomain(d); err != nil {
			t.Errorf("合法域名 %q 被拒绝: %v", d, err)
		}
	}
	bad := []string{
		"", " ", "../etc/passwd", "example.com/../../tmp", "http://example.com",
		"exa mple.com", "example", "*.com", "example..com", "a.com\n", "../../../root/.ssh/x",
	}
	for _, d := range bad {
		if err := ValidateDomain(d); err == nil {
			t.Errorf("非法域名 %q 未被拒绝", d)
		}
	}
}

// 缺证书时必须能自动补一张自签占位证书，否则 nginx -t 会以
// "cannot load certificate ... No such file or directory" 失败并回滚站点。
func TestEnsureSiteCertInGeneratesSelfSigned(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "ssl") // 目录本身也不存在，顺带验证 MkdirAll
	domain := "ngxi.example.com"

	created, err := EnsureSiteCertIn(dir, domain)
	if err != nil {
		t.Fatalf("生成自签证书失败: %v", err)
	}
	if !created {
		t.Fatalf("首次调用应返回 created=true")
	}

	crtPath := filepath.Join(dir, domain+".crt")
	keyPath := filepath.Join(dir, domain+".key")
	for _, p := range []string{crtPath, keyPath} {
		info, err := os.Stat(p)
		if err != nil {
			t.Fatalf("%s 未生成: %v", p, err)
		}
		if info.Size() == 0 {
			t.Fatalf("%s 为空文件", p)
		}
	}
	if runtime.GOOS != "windows" {
		info, _ := os.Stat(keyPath)
		if perm := info.Mode().Perm(); perm != 0600 {
			t.Errorf("私钥权限应为 0600，实际 %o", perm)
		}
	}

	// 证书必须是 nginx 能加载的合法 X.509，且 SAN 覆盖该域名
	pair, err := tls.LoadX509KeyPair(crtPath, keyPath)
	if err != nil {
		t.Fatalf("证书/私钥不匹配或不可解析: %v", err)
	}
	leaf, err := x509.ParseCertificate(pair.Certificate[0])
	if err != nil {
		t.Fatalf("解析证书失败: %v", err)
	}
	if leaf.Subject.CommonName != domain {
		t.Errorf("CN 应为 %s，实际 %s", domain, leaf.Subject.CommonName)
	}
	if len(leaf.DNSNames) == 0 || leaf.DNSNames[0] != domain {
		t.Errorf("SAN 未包含 %s: %v", domain, leaf.DNSNames)
	}
	if !leaf.NotAfter.After(leaf.NotBefore) {
		t.Errorf("有效期非法: %v ~ %v", leaf.NotBefore, leaf.NotAfter)
	}

	// 幂等：已有证书时不再覆盖（用户换上的正式证书不能被踩掉）
	created, err = EnsureSiteCertIn(dir, domain)
	if err != nil {
		t.Fatalf("第二次调用报错: %v", err)
	}
	if created {
		t.Errorf("已有证书时不应重复生成")
	}
}

// 已有证书但私钥缺失，仍应补齐。
func TestEnsureSiteCertInRepairsMissingKey(t *testing.T) {
	dir := t.TempDir()
	domain := "half.example.com"
	if _, err := EnsureSiteCertIn(dir, domain); err != nil {
		t.Fatalf("首次生成失败: %v", err)
	}
	if err := os.Remove(filepath.Join(dir, domain+".key")); err != nil {
		t.Fatalf("删除私钥失败: %v", err)
	}
	created, err := EnsureSiteCertIn(dir, domain)
	if err != nil {
		t.Fatalf("补齐失败: %v", err)
	}
	if !created {
		t.Errorf("私钥缺失时应重新生成并返回 created=true")
	}
	if !fileNonEmpty(filepath.Join(dir, domain+".key")) {
		t.Errorf("私钥未补齐")
	}
}

func TestEnsureSiteCertInRejectsBadDomain(t *testing.T) {
	if _, err := EnsureSiteCertIn(t.TempDir(), "../../etc/passwd"); err == nil {
		t.Errorf("非法域名不应生成证书")
	}
}

// 证书缺失的 emerg 必须被翻译成"放哪个路径、怎么补"，而不是把 BIO_new_file 原文甩给用户。
func TestCertMissingHint(t *testing.T) {
	raw := `nginx: [emerg] cannot load certificate "/etc/nginx/ssl/ngxi.example.com.crt": ` +
		`BIO_new_file() failed (SSL: error:80000002:system library::No such file or directory:` +
		`calling fopen(/etc/nginx/ssl/ngxi.example.com.crt, r) error:10000080:BIO routines::no such file)` +
		"\nnginx: configuration file /etc/nginx/nginx.conf test failed"

	hint := certMissingHint(raw)
	for _, want := range []string{
		"/etc/nginx/ssl/ngxi.example.com.crt",
		"/etc/nginx/ssl/ngxi.example.com.key",
		"Cloudflare Origin Certificate",
		"自签",
	} {
		if !strings.Contains(hint, want) {
			t.Errorf("提示缺少 %q，实际: %s", want, hint)
		}
	}

	// 私钥缺失（cannot load certificate key）同样要命中
	keyRaw := `nginx: [emerg] cannot load certificate key "/etc/nginx/ssl/a.com.key": BIO_new_file() failed`
	if h := certMissingHint(keyRaw); !strings.Contains(h, "/etc/nginx/ssl/a.com.key") {
		t.Errorf("私钥缺失未命中: %s", h)
	}

	// 其他 emerg 不误报
	for _, other := range []string{
		`nginx: [emerg] unknown directive "ssl_certificatee" in /etc/nginx/sites-enabled/a.conf:12`,
		``,
	} {
		if h := certMissingHint(other); h != "" {
			t.Errorf("无关错误被误报: %s", h)
		}
	}
}

// CreateSite 必须在校验阶段就挡掉非法域名，否则域名会被拼成
// sites-available/<domain> 与 ssl/<domain>.crt，形成路径穿越。
func TestCreateSiteRejectsBadDomain(t *testing.T) {
	s := &SiteService{}
	for _, d := range []string{"../../etc/cron.d/pwn", "", "bad domain.com"} {
		if err := s.CreateSite(model.SiteConfig{Domain: d, Type: "proxy"}); err == nil {
			t.Errorf("CreateSite 接受了非法域名 %q", d)
		}
	}
}

// 前端提示只在真的生成了占位证书时才有内容。
func TestSiteCertWarning(t *testing.T) {
	if w := SiteCertWarning("example.com", false); w != "" {
		t.Errorf("未生成证书时不该有提示: %s", w)
	}
	w := SiteCertWarning("example.com", true)
	if !strings.Contains(w, "自签") || !strings.Contains(w, "example.com.crt") {
		t.Errorf("提示内容不完整: %s", w)
	}
}
