package model

import (
	"os"
	"path/filepath"
	"testing"
)

// ACME 模块常以 load_module 动态加载，不会出现在 nginx -V 里，
// 必须从主配置识别，否则新建站点会退化成自管证书路径。
func TestACMEFromConfig(t *testing.T) {
	cases := []struct {
		name    string
		content string
		want    bool
	}{
		{
			name:    "动态加载 acme 模块",
			content: "user www-data;\nload_module /usr/lib/nginx/modules/ngx_http_acme_module.so;\n",
			want:    true,
		},
		{
			name:    "缩进 + 大写",
			content: "  Load_Module /usr/lib/nginx/modules/NGX_HTTP_ACME_MODULE.SO;\n",
			want:    true,
		},
		{
			name:    "加载了其他模块但不是 acme",
			content: "load_module /usr/lib/nginx/modules/ngx_http_brotli_filter_module.so;\n",
			want:    false,
		},
		{
			name:    "注释掉的 load_module 不算",
			content: "# load_module modules/ngx_http_acme_module.so;\n",
			want:    false,
		},
		{
			name:    "普通配置",
			content: "worker_processes auto;\n",
			want:    false,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			dir := t.TempDir()
			if err := os.WriteFile(filepath.Join(dir, "nginx.conf"), []byte(tc.content), 0o644); err != nil {
				t.Fatal(err)
			}
			if got := acmeLoadedFromConfig(dir); got != tc.want {
				t.Errorf("acmeLoadedFromConfig() = %v, want %v", got, tc.want)
			}
		})
	}

	// 配置不存在时不应 panic，且返回 false
	if acmeLoadedFromConfig(filepath.Join(t.TempDir(), "not-exist")) {
		t.Error("配置缺失时应返回 false")
	}
}
