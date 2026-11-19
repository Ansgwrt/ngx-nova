package service

import "testing"

func TestCheckNginxVersionVulnerable(t *testing.T) {
	cases := []struct {
		installed      string
		wantVulnerable bool
		wantBranch     string
	}{
		{"nginx/1.28.0", true, "stable"},
		{"1.28.0", true, "stable"},
		{"1.26.3", true, "stable"},
		{"1.29.6", true, "mainline"},
		{"1.31.8", true, "mainline"},
		{"1.30.7", false, "stable"},
		{"1.31.9", false, "mainline"},
		{"", false, "unknown"},
		{"not-a-version", false, "unknown"},
	}

	for _, tc := range cases {
		report := CheckNginxVersion(tc.installed)
		if report.Vulnerable != tc.wantVulnerable {
			t.Errorf("CheckNginxVersion(%q).Vulnerable = %v, want %v (命中: %d 条, summary=%s)",
				tc.installed, report.Vulnerable, tc.wantVulnerable, report.TotalAffected, report.Summary)
		}
		if report.Branch != tc.wantBranch {
			t.Errorf("CheckNginxVersion(%q).Branch = %q, want %q", tc.installed, report.Branch, tc.wantBranch)
		}
	}
}

func TestCheckNginxVersionRecommendation(t *testing.T) {
	report := CheckNginxVersion("1.28.0")
	if report.UpgradeTo != "1.30.7" {
		t.Errorf("stable 分支建议升级版本 = %q, want 1.30.7", report.UpgradeTo)
	}
	if report.Status != "vulnerable" {
		t.Errorf("1.28.0 的状态 = %q, want vulnerable", report.Status)
	}
	if report.MajorCount == 0 {
		t.Error("1.28.0 至少应命中一条 major 级别公告")
	}
	if len(report.Affected) != report.TotalAffected {
		t.Error("Affected 列表长度与 TotalAffected 不一致")
	}
	for _, adv := range report.Affected {
		if adv.CVE == "" {
			t.Errorf("公告缺少 CVE 编号: %s", adv.Title)
		}
	}

	mainline := CheckNginxVersion("1.31.1")
	if mainline.UpgradeTo != "1.31.9" {
		t.Errorf("mainline 分支建议升级版本 = %q, want 1.31.9", mainline.UpgradeTo)
	}
}

func TestAdvisoryDatabaseLoaded(t *testing.T) {
	db, err := loadAdvisories()
	if err != nil {
		t.Fatalf("漏洞库解析失败: %v", err)
	}
	if len(db.Advisories) < 20 {
		t.Fatalf("漏洞库条目过少: %d", len(db.Advisories))
	}
	if db.Recommended["stable"] != "1.30.7" || db.Recommended["mainline"] != "1.31.9" {
		t.Fatalf("建议版本推导异常: %+v", db.Recommended)
	}
}

func TestIsValidNginxVersion(t *testing.T) {
	valid := []string{"1.30.7", "1.31.9", "0.8.55"}
	invalid := []string{"", "1.30", "1.30.7.1", "1.30.7; rm -rf /", "nginx/1.30.7", "1.30.7 ", "$(id)"}

	for _, v := range valid {
		if !IsValidNginxVersion(v) {
			t.Errorf("IsValidNginxVersion(%q) = false, want true", v)
		}
	}
	for _, v := range invalid {
		if IsValidNginxVersion(v) {
			t.Errorf("IsValidNginxVersion(%q) = true, want false", v)
		}
	}
}

func TestLoginLimiterLocksAfterFailures(t *testing.T) {
	limiter := NewLoginLimiter(3, 0)
	for i := 0; i < 3; i++ {
		if ok, _ := limiter.Allow("1.2.3.4"); !ok {
			t.Fatalf("第 %d 次尝试不应被拦截", i+1)
		}
		limiter.Fail("1.2.3.4")
	}
	if ok, _ := limiter.Allow("1.2.3.4"); ok {
		t.Fatal("连续失败达到上限后应被拦截")
	}
	if ok, _ := limiter.Allow("5.6.7.8"); !ok {
		t.Fatal("其他 IP 不应受影响")
	}
	limiter.Reset("1.2.3.4")
	if ok, _ := limiter.Allow("1.2.3.4"); !ok {
		t.Fatal("Reset 后应恢复可用")
	}
}
