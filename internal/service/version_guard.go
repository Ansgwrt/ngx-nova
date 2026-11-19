package service

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
)

// advisories.json 由 scripts/gen_advisories.py 从 nginx.org 官方公告页生成，
// 随二进制内嵌，因此版本自检完全离线、不依赖外网，也不会被中间人替换。
//
//go:embed advisories.json
var advisoriesJSON []byte

// VersionRule 描述公告里的一条版本区间规则。
type VersionRule struct {
	Op      string `json:"op"`      // gte | range | eq
	Version string `json:"version"` // op=gte|eq 时使用
	From    string `json:"from"`    // op=range 时使用
	To      string `json:"to"`      // op=range 时使用
}

// Advisory 是单条 nginx 安全公告。
type Advisory struct {
	Title            string        `json:"title"`
	Severity         string        `json:"severity"`
	CVE              string        `json:"cve"`
	NotVulnerable    []VersionRule `json:"not_vulnerable"`
	Vulnerable       []VersionRule `json:"vulnerable"`
	NotVulnerableRaw string        `json:"not_vulnerable_text"`
	VulnerableRaw    string        `json:"vulnerable_text"`
}

type advisoryDB struct {
	Source      string            `json:"source"`
	GeneratedAt string            `json:"generated_at"`
	Count       int               `json:"count"`
	Recommended map[string]string `json:"recommended"`
	Advisories  []Advisory        `json:"advisories"`
}

// VersionReport 是版本自检结果，直接作为 /api/v1/system/version 的响应体。
type VersionReport struct {
	Installed      string     `json:"installed"`
	Branch         string     `json:"branch"` // stable | mainline | unknown
	Status         string     `json:"status"` // up_to_date | upgrade_recommended | vulnerable | unknown
	UpgradeTo      string     `json:"upgrade_to"`
	LatestStable   string     `json:"latest_stable"`
	LatestMainline string     `json:"latest_mainline"`
	Vulnerable     bool       `json:"vulnerable"`
	Affected       []Advisory `json:"affected"`
	MajorCount     int        `json:"major_count"`
	TotalAffected  int        `json:"total_affected"`
	AdvisoryTotal  int        `json:"advisory_total"`
	AdvisorySource string     `json:"advisory_source"`
	GeneratedAt    string     `json:"advisory_generated_at"`
	Summary        string     `json:"summary"`
}

var (
	advisoryOnce sync.Once
	advisoryData advisoryDB
	advisoryErr  error

	versionRe = regexp.MustCompile(`(\d+)\.(\d+)\.(\d+)`)
)

func loadAdvisories() (advisoryDB, error) {
	advisoryOnce.Do(func() {
		advisoryErr = json.Unmarshal(advisoriesJSON, &advisoryData)
	})
	return advisoryData, advisoryErr
}

type nginxVersion [3]int

func parseNginxVersion(raw string) (nginxVersion, bool) {
	m := versionRe.FindStringSubmatch(raw)
	if len(m) != 4 {
		return nginxVersion{}, false
	}
	var v nginxVersion
	for i := 0; i < 3; i++ {
		n, err := strconv.Atoi(m[i+1])
		if err != nil {
			return nginxVersion{}, false
		}
		v[i] = n
	}
	return v, true
}

func (v nginxVersion) String() string {
	return fmt.Sprintf("%d.%d.%d", v[0], v[1], v[2])
}

func compareNginxVersion(a, b nginxVersion) int {
	for i := 0; i < 3; i++ {
		if a[i] != b[i] {
			if a[i] < b[i] {
				return -1
			}
			return 1
		}
	}
	return 0
}

func (r VersionRule) matches(v nginxVersion) bool {
	switch r.Op {
	case "gte":
		target, ok := parseNginxVersion(r.Version)
		return ok && compareNginxVersion(v, target) >= 0
	case "eq":
		target, ok := parseNginxVersion(r.Version)
		return ok && compareNginxVersion(v, target) == 0
	case "range":
		lo, okLo := parseNginxVersion(r.From)
		hi, okHi := parseNginxVersion(r.To)
		if !okLo || !okHi {
			return false
		}
		return compareNginxVersion(v, lo) >= 0 && compareNginxVersion(v, hi) <= 0
	default:
		return false
	}
}

// affects 判断某个版本是否受该公告影响。
//
// 注意：nginx 公告里的版本区间是「数值区间」，但修复是按分支发布的。
// 例如某公告写 "Vulnerable: 0.6.18-1.31.8 / Not vulnerable: 1.31.9+, 1.30.7+"，
// 数值上 1.30.7 落在 0.6.18-1.31.8 之内，但该分支的 1.30.7 已修复，不应判为受影响。
// 因此先按分支（偶数号 stable / 奇数号 mainline）判断是否已达到本分支修复版，再看区间。
func (a Advisory) affects(v nginxVersion) bool {
	branch := v[1] % 2

	for _, rule := range a.NotVulnerable {
		if rule.Op != "gte" {
			continue
		}
		fixed, ok := parseNginxVersion(rule.Version)
		if !ok {
			continue
		}
		if fixed[1]%2 != branch {
			continue
		}
		if compareNginxVersion(v, fixed) >= 0 {
			return false
		}
	}

	for _, rule := range a.Vulnerable {
		if rule.matches(v) {
			return true
		}
	}
	return false
}

func severityWeight(s string) int {
	switch strings.ToLower(s) {
	case "major":
		return 3
	case "medium":
		return 2
	case "low":
		return 1
	default:
		return 0
	}
}

func branchOf(v nginxVersion) string {
	if v[1]%2 == 1 {
		return "mainline"
	}
	return "stable"
}

// CheckNginxVersion 把实测版本与内嵌公告库比对，给出是否受漏洞影响与建议升级目标。
func CheckNginxVersion(installedRaw string) VersionReport {
	db, err := loadAdvisories()

	report := VersionReport{
		Installed:      strings.TrimSpace(installedRaw),
		Branch:         "unknown",
		Status:         "unknown",
		UpgradeTo:      "",
		LatestStable:   db.Recommended["stable"],
		LatestMainline: db.Recommended["mainline"],
		Affected:       []Advisory{},
		AdvisoryTotal:  len(db.Advisories),
		AdvisorySource: db.Source,
		GeneratedAt:    db.GeneratedAt,
	}
	if report.LatestStable == "" {
		report.LatestStable = "1.30.7"
	}
	if report.LatestMainline == "" {
		report.LatestMainline = "1.31.9"
	}

	version, ok := parseNginxVersion(installedRaw)
	if !ok {
		report.Summary = "未检测到可解析的 Nginx 版本，可能尚未安装或不在标准路径。"
		if err != nil {
			report.Summary = "漏洞库加载失败: " + err.Error()
		}
		return report
	}

	report.Installed = version.String()
	report.Branch = branchOf(version)

	for _, adv := range db.Advisories {
		if adv.affects(version) {
			report.Affected = append(report.Affected, adv)
		}
	}

	sort.SliceStable(report.Affected, func(i, j int) bool {
		return severityWeight(report.Affected[i].Severity) > severityWeight(report.Affected[j].Severity)
	})

	report.TotalAffected = len(report.Affected)
	for _, adv := range report.Affected {
		if severityWeight(adv.Severity) >= 3 {
			report.MajorCount++
		}
	}
	report.Vulnerable = report.TotalAffected > 0

	target := report.LatestStable
	if report.Branch == "mainline" {
		target = report.LatestMainline
	}
	report.UpgradeTo = target

	targetVersion, targetOK := parseNginxVersion(target)
	switch {
	case !targetOK:
		report.Status = "unknown"
	case report.Vulnerable:
		report.Status = "vulnerable"
	case compareNginxVersion(version, targetVersion) < 0:
		report.Status = "upgrade_recommended"
	default:
		report.Status = "up_to_date"
	}

	switch report.Status {
	case "vulnerable":
		report.Summary = fmt.Sprintf("当前 %s 命中 %d 条 nginx 安全公告（其中 major %d 条），建议立即升级到 %s。",
			report.Installed, report.TotalAffected, report.MajorCount, report.UpgradeTo)
	case "upgrade_recommended":
		report.Summary = fmt.Sprintf("当前 %s 未命中已知公告，但低于 %s 分支最新修复版 %s，建议跟随升级。",
			report.Installed, report.Branch, report.UpgradeTo)
	case "up_to_date":
		report.Summary = fmt.Sprintf("当前 %s 已是 %s 分支最新修复版，未命中任何已知公告。",
			report.Installed, report.Branch)
	default:
		report.Summary = "无法判断版本状态。"
	}
	return report
}

// AdvisoryCount 返回内嵌公告库条数，供健康检查展示。
func AdvisoryCount() int {
	db, err := loadAdvisories()
	if err != nil {
		return 0
	}
	return len(db.Advisories)
}

// IsValidNginxVersion 校验 "1.30.7" 形式的版本号，防止把任意字符串拼进命令。
func IsValidNginxVersion(v string) bool {
	if !versionRe.MatchString(v) {
		return false
	}
	// 必须整体匹配，拒绝 "1.2.3; rm -rf /" 这类注入尝试。
	_, ok := parseNginxVersion(v)
	return ok && versionRe.FindString(v) == v
}
