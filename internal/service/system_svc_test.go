package service

import (
	"strings"
	"testing"
)

// 共享内存区尺寸冲突是最容易在"面板建站"时踩到的 emerg，
// 必须给出可执行提示，而不是把 nginx 原文直接甩给用户。
func TestZoneConflictHint(t *testing.T) {
	cases := []struct {
		name string
		out  string
		want bool
	}{
		{
			name: "ssl_session_cache 尺寸冲突",
			out: "nginx: [emerg] the size 10485760 of shared memory zone \"SSL\" conflicts " +
				"with already declared size 31457280 in /etc/nginx/nginx.conf:38\n" +
				"nginx: configuration file /etc/nginx/nginx.conf test failed",
			want: true,
		},
		{
			name: "limit_req_zone 尺寸冲突",
			out:  "nginx: [emerg] the size 20971520 of shared memory zone \"api\" conflicts with already declared size 10485760 in /etc/nginx/conf.d/limit.conf:3",
			want: true,
		},
		{
			name: "其他 emerg 不误报",
			out:  "nginx: [emerg] unknown directive \"ssl_certificatee\" in /etc/nginx/sites-enabled/a.conf:12",
			want: false,
		},
		{
			name: "空输出",
			out:  "",
			want: false,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := zoneConflictHint(tc.out)
			if tc.want && !strings.Contains(got, "只能声明一次") {
				t.Errorf("应给出同名 zone 提示，实际: %q", got)
			}
			if !tc.want && got != "" {
				t.Errorf("不应给出提示，实际: %q", got)
			}
		})
	}
}
