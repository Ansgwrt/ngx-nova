package service

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"fmt"
	"math/big"
	"nginx-mgr/internal/model"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

// 自管证书的前置条件一直是个坑：站点模板在没有 ACME 模块时会渲染
//
//	ssl_certificate     /etc/nginx/ssl/<domain>.crt;
//	ssl_certificate_key /etc/nginx/ssl/<domain>.key;
//
// 但面板此前既不创建 ssl 目录，也不检查证书是否存在，于是第一次建站必然得到
//
//	[emerg] cannot load certificate "/etc/nginx/ssl/x.crt": BIO_new_file() failed ...
//	(SSL: error:80000002:system library::No such file or directory)
//
// 再叠加"nginx -t 失败自动回滚"，用户看到的就是一句没有上下文的 emerg，
// 站点配置也没落盘。下面的逻辑把这三个环节补齐：建目录、补证书、翻译报错。

// domainRe 允许普通域名与通配符域名（*.example.com）。
// 只放行字母数字、连字符与点，域名会直接拼进文件路径，
// 因此必须挡住 "/"、".." 这类能逃出配置目录的字符。
var domainRe = regexp.MustCompile(`^(\*\.)?([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$`)

// ValidateDomain 校验域名格式，兼作路径穿越防护。
// 注意这里不接受空白字符：域名会被拼进文件路径与 sites-enabled 的链接名，
// 带空格/换行的域名虽然能被 TrimSpace "洗干净"，但调用方拿到的仍是原值。
func ValidateDomain(domain string) error {
	if strings.TrimSpace(domain) == "" {
		return fmt.Errorf("域名不能为空")
	}
	if strings.ContainsAny(domain, " \t\r\n\"'`$;#&|<>") {
		return fmt.Errorf("域名 %q 含有空白或特殊字符", domain)
	}
	if !domainRe.MatchString(domain) {
		return fmt.Errorf("域名格式非法: %q（只接受 example.com 或 *.example.com 形式，不能包含斜杠、连续点号、空格等字符）", domain)
	}
	return nil
}

// CertDir 返回自管证书目录，必须与模板里的 SSLDir() 完全一致。
func CertDir() string { return filepath.Join(model.ConfDir(), "ssl") }

// CertPaths 返回某个域名的证书与私钥路径。
func CertPaths(domain string) (crt, key string) {
	dir := CertDir()
	return filepath.Join(dir, domain+".crt"), filepath.Join(dir, domain+".key")
}

// EnsureSSLDir 创建自管证书目录。
// 面板安装的 nginx 默认没有 ssl 目录，缺了它 nginx -t 会直接 emerg。
func EnsureSSLDir() error {
	if err := os.MkdirAll(CertDir(), 0755); err != nil {
		return fmt.Errorf("创建证书目录 %s 失败: %w", CertDir(), err)
	}
	return nil
}

// CertExists 判断某域名的证书与私钥是否都已存在且非空。
func CertExists(domain string) bool {
	crt, key := CertPaths(domain)
	return fileNonEmpty(crt) && fileNonEmpty(key)
}

func fileNonEmpty(path string) bool {
	info, err := os.Stat(path)
	return err == nil && !info.IsDir() && info.Size() > 0
}

// EnsureSiteCert 在写站点配置之前把 HTTPS 前置条件补齐。
// 返回 created 表示本次新生成了自签占位证书（调用方可以据此提醒用户替换成正式证书）。
//
// ACME 模块可用时模板走 acme_certificate，不需要本地文件，直接返回。
func EnsureSiteCert(domain string) (created bool, err error) {
	if model.ACMEEnabled() {
		return false, nil
	}
	return EnsureSiteCertIn(CertDir(), domain)
}

// EnsureSiteCertIn 是 EnsureSiteCert 的可测试版本：目录可指定。
func EnsureSiteCertIn(dir, domain string) (created bool, err error) {
	if err := ValidateDomain(domain); err != nil {
		return false, err
	}
	if model.ACMEEnabled() {
		return false, nil
	}
	crt := filepath.Join(dir, domain+".crt")
	key := filepath.Join(dir, domain+".key")
	if fileNonEmpty(crt) && fileNonEmpty(key) {
		return false, nil
	}
	if err := os.MkdirAll(dir, 0755); err != nil {
		return false, fmt.Errorf("创建证书目录 %s 失败: %w", dir, err)
	}
	if err := generateSelfSigned(crt, key, domain); err != nil {
		return false, err
	}
	return true, nil
}

// generateSelfSigned 生成一张仅用于"让 nginx -t 通过"的自签占位证书。
// 真实公网访问必须换成 Cloudflare Origin Certificate 或 Let's Encrypt 证书，
// 否则浏览器会报 NET::ERR_CERT_AUTHORITY_INVALID。
func generateSelfSigned(crtPath, keyPath, domain string) error {
	priv, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return fmt.Errorf("生成私钥失败: %w", err)
	}
	serial, err := rand.Int(rand.Reader, new(big.Int).Lsh(big.NewInt(1), 128))
	if err != nil {
		return fmt.Errorf("生成证书序列号失败: %w", err)
	}
	now := time.Now()
	tmpl := &x509.Certificate{
		SerialNumber:          serial,
		Subject:               pkix.Name{CommonName: domain, Organization: []string{"ngx-nova self-signed"}},
		NotBefore:             now.Add(-time.Hour), // 容忍机器时间小幅漂移
		NotAfter:              now.AddDate(1, 0, 0),
		KeyUsage:              x509.KeyUsageDigitalSignature | x509.KeyUsageKeyEncipherment,
		ExtKeyUsage:           []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		BasicConstraintsValid: true,
		DNSNames:              []string{domain},
	}
	der, err := x509.CreateCertificate(rand.Reader, tmpl, tmpl, &priv.PublicKey, priv)
	if err != nil {
		return fmt.Errorf("签发自签证书失败: %w", err)
	}

	crtPEM := pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der})
	keyPEM := pem.EncodeToMemory(&pem.Block{Type: "RSA PRIVATE KEY", Bytes: x509.MarshalPKCS1PrivateKey(priv)})
	// 证书 0644，私钥 0600：与 nginx 的读取方式一致，同时不给同机其他用户留口子。
	if err := os.WriteFile(crtPath, crtPEM, 0644); err != nil {
		return fmt.Errorf("写入证书 %s 失败: %w", crtPath, err)
	}
	if err := os.WriteFile(keyPath, keyPEM, 0600); err != nil {
		return fmt.Errorf("写入私钥 %s 失败: %w", keyPath, err)
	}
	return nil
}

// SiteCertWarning 返回给前端展示的提示文案；没生成占位证书时返回空串。
func SiteCertWarning(domain string, created bool) string {
	if !created {
		return ""
	}
	crt, key := CertPaths(domain)
	return fmt.Sprintf(
		"站点已启用，但本机 nginx 未编译 ACME 模块，已自动生成自签占位证书（%s / %s）。"+
			"浏览器会提示证书不受信任，请把它替换为 Cloudflare Origin Certificate 或 Let's Encrypt 证书后重载 nginx。",
		crt, key)
}
