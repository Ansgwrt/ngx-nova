package service

import (
	"fmt"
	"nginx-mgr/internal/executor"
	"nginx-mgr/internal/model"
	"os"
	pathpkg "path"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"
)

type SystemService struct {
	notificationSvc *NotificationService
	trafficMgr      *TrafficUsageManager
}

func NewSystemService(notificationSvc *NotificationService, trafficMgr *TrafficUsageManager) *SystemService {
	if notificationSvc == nil {
		notificationSvc = NewNotificationService()
	}
	if trafficMgr == nil {
		trafficMgr = NewTrafficUsageManager("")
	}
	return &SystemService{
		notificationSvc: notificationSvc,
		trafficMgr:      trafficMgr,
	}
}

// Reload 先做配置测试，再按环境选择重载方式。
// 裸机/systemd 用 systemctl；容器或非 systemd 环境退回 nginx -s reload；都没跑起来则直接启动。
// 这样同一份二进制在 systemd 主机和 Docker 里都能用。
func (s *SystemService) Reload() error {
	sbin := model.SbinPath()
	if out, err := executor.ExecuteSimple(sbin, "-t"); err != nil {
		return fmt.Errorf("Nginx 配置测试失败: %s%s%s", strings.TrimSpace(out), zoneConflictHint(out), certMissingHint(out))
	}

	if _, err := executor.ExecuteSimple("systemctl", "reload", "nginx"); err == nil {
		return nil
	}

	// 2) 无 systemd（容器 / 精简系统）：给 master 进程发 HUP
	if nginxPid() > 0 {
		if out, err := executor.ExecuteSimple(sbin, "-s", "reload"); err != nil {
			return fmt.Errorf("Nginx 重载失败: %s", strings.TrimSpace(out))
		}
		return nil
	}

	// 3) 尚未运行：直接启动
	if out, err := executor.ExecuteSimple(sbin); err != nil {
		return fmt.Errorf("Nginx 启动失败: %s", strings.TrimSpace(out))
	}
	return nil
}

// zoneConflictHint 把 nginx -t 里"同名共享内存区尺寸冲突"的 emerg 翻译成可执行的修复建议。
// 这类错误的典型来源是 ssl_session_cache（shared:SSL）与 limit_req_zone / limit_conn_zone：
// 同名 zone 整份配置只能声明一次，多处声明时 size 必须完全一致，否则 nginx 直接拒绝加载。
func zoneConflictHint(out string) string {
	if !strings.Contains(out, "conflicts with already declared size") {
		return ""
	}
	return "\n提示：同名共享内存区（如 ssl_session_cache shared:SSL、limit_req_zone）整份配置只能声明一次，" +
		"重复声明时 size 必须完全一致。请把主配置与站点里的尺寸统一；" +
		"v1.0.4 起站点模板不再注入 ssl_session_cache，重新创建或编辑站点即可消除该冲突。"
}

// certMissingHint 把 "cannot load certificate" 类 emerg 翻译成可执行的修复建议。
// 触发场景：本机 nginx 没有 ACME 模块，站点模板引用 $SSLDir/<domain>.crt|.key，
// 而这两个文件不存在（面板很最早的版本连 ssl 目录都不建）。
// nginx 原文只是 BIO_new_file() failed + errno，用户无法判断要做什么。
// 路径统一用 path 包拼（nginx 配置永远是正斜杠，filepath 在 Windows 上会给出反斜杠）。
func certMissingHint(out string) string {
	if !strings.Contains(out, "cannot load certificate") &&
		!strings.Contains(out, "BIO_new_file() failed") &&
		!strings.Contains(out, "cannot load certificate key") {
		return ""
	}
	path := ""
	if m := certPathRe.FindStringSubmatch(out); len(m) > 1 {
		path = m[1]
	}
	if path == "" {
		return "\n提示：站点模板引用的证书文件不存在。请把 <域名>.crt 与 <域名>.key 放到 " +
			CertDir() + "/ 下（文件名必须与站点域名一致），然后重试。"
	}
	base := strings.TrimSuffix(strings.TrimSuffix(pathpkg.Base(path), ".crt"), ".key")
	return "\n提示：找不到证书文件 " + path + "。本机 nginx 未编译 ACME 模块，面板只读取固定路径，" +
		"因此该域名的证书需要自己放：\n" +
		"  证书: " + pathpkg.Join(pathpkg.Dir(path), base+".crt") + "\n" +
		"  私钥: " + pathpkg.Join(pathpkg.Dir(path), base+".key") + "\n" +
		"两种做法任选：\n" +
		"  1) 申请正式证书（Cloudflare Origin Certificate / Let's Encrypt）后保存到上面两个路径；\n" +
		"  2) 直接重新保存站点，面板会自动补一张自签占位证书（浏览器会提示不受信任）。"
}

// certPathRe 从 emerg 里抠出证书路径，用于给出精确提示。
var certPathRe = regexp.MustCompile(`cannot load certificate(?: key)? "([^"]+)"`)

// nginxPid 读取 pid 文件并确认进程仍存活，返回 0 表示未运行。
func nginxPid() int {
	data, err := os.ReadFile(filepath.Join(model.NginxPidDir, "nginx.pid"))
	if err != nil {
		return 0
	}
	pid, err := strconv.Atoi(strings.TrimSpace(string(data)))
	if err != nil || pid <= 0 {
		return 0
	}
	if _, err := os.Stat(fmt.Sprintf("/proc/%d", pid)); err != nil {
		return 0
	}
	return pid
}

// NginxActive 判断 nginx 是否在运行，systemd 不可用时退化为 pid 文件判断。
func NginxActive() bool {
	if out, err := executor.ExecuteSimple("systemctl", "is-active", "nginx"); err == nil {
		if strings.TrimSpace(out) == "active" {
			return true
		}
	}
	return nginxPid() > 0
}

func (s *SystemService) Backup() (string, error) {
	backupDir := "/root/nginx_backups"
	os.MkdirAll(backupDir, 0755)

	filename := fmt.Sprintf("nginx_conf_%s.tar.gz", time.Now().Format("20060102_150405"))
	path := filepath.Join(backupDir, filename)

	// 备份 /etc/nginx 和 /var/www/html
	_, err := executor.ExecuteSimple("tar", "-czf", path, "-C", "/", "etc/nginx", "var/www/html")
	if err != nil {
		return "", err
	}
	return path, nil
}

func (s *SystemService) Restore(backupPath string) error {
	backupPath = strings.TrimSpace(backupPath)
	if backupPath == "" {
		return fmt.Errorf("备份文件路径不能为空")
	}

	cleanPath := filepath.Clean(backupPath)
	info, err := os.Stat(cleanPath)
	if err != nil {
		if os.IsNotExist(err) {
			return fmt.Errorf("备份文件不存在: %s", cleanPath)
		}
		return fmt.Errorf("检查备份文件失败: %w", err)
	}

	if info.IsDir() {
		selected, err := selectLatestBackup(cleanPath)
		if err != nil {
			return err
		}
		cleanPath = selected
		info, err = os.Stat(cleanPath)
		if err != nil {
			return fmt.Errorf("读取备份文件失败: %w", err)
		}
	}

	if _, err := executor.ExecuteSimple("tar", "-tzf", cleanPath); err != nil {
		return fmt.Errorf("备份文件校验失败: %w", err)
	}

	currentBackup := fmt.Sprintf("/tmp/nginx_pre_restore_%d.tar.gz", time.Now().Unix())
	if _, err := executor.ExecuteSimple("tar", "-czf", currentBackup, "-C", "/", "etc/nginx", "var/www/html"); err != nil {
		return fmt.Errorf("当前配置备份失败: %w", err)
	}
	defer os.Remove(currentBackup)

	if _, err := executor.ExecuteSimple("systemctl", "stop", "nginx"); err != nil {
		_, _ = executor.ExecuteSimple("pkill", "-9", "nginx")
	}

	tmpDir, err := os.MkdirTemp("", "nginx_restore")
	if err != nil {
		_ = s.restoreFromBackup(currentBackup)
		return fmt.Errorf("创建临时目录失败: %w", err)
	}
	defer os.RemoveAll(tmpDir)

	if _, err := executor.ExecuteSimple("tar", "-xzf", cleanPath, "-C", tmpDir); err != nil {
		rollbackErr := s.restoreFromBackup(currentBackup)
		if rollbackErr != nil {
			return fmt.Errorf("解压备份失败: %v；尝试恢复原配置时出错: %v", err, rollbackErr)
		}
		return fmt.Errorf("解压备份失败: %w", err)
	}

	if err := s.applyExtractedArchive(tmpDir); err != nil {
		rollbackErr := s.restoreFromBackup(currentBackup)
		if rollbackErr != nil {
			return fmt.Errorf("恢复失败: %v；尝试恢复原配置时出错: %v", err, rollbackErr)
		}
		return fmt.Errorf("恢复失败: %w", err)
	}

	if _, err := executor.ExecuteSimple(model.SbinPath(), "-t"); err != nil {
		rollbackErr := s.restoreFromBackup(currentBackup)
		if rollbackErr != nil {
			return fmt.Errorf("配置验证失败: %v；尝试恢复原配置时出错: %v", err, rollbackErr)
		}
		return fmt.Errorf("配置验证失败: %w", err)
	}

	if _, err := executor.ExecuteSimple("systemctl", "start", "nginx"); err != nil {
		rollbackErr := s.restoreFromBackup(currentBackup)
		if rollbackErr != nil {
			return fmt.Errorf("启动 Nginx 失败: %v；尝试恢复原配置时出错: %v", err, rollbackErr)
		}
		return fmt.Errorf("启动 Nginx 失败: %w", err)
	}

	return nil
}

func (s *SystemService) Stop() error {
	_, err := executor.ExecuteSimple("systemctl", "stop", "nginx")
	return err
}

func (s *SystemService) Uninstall() error {
	cmd := buildAcmeScriptCommand([]string{"15", "YES", "", "0"})
	out, err := executor.ExecuteSimple("bash", "-c", cmd)
	if err != nil {
		msg := strings.TrimSpace(out)
		if msg == "" {
			msg = err.Error()
		}
		return fmt.Errorf("卸载脚本执行失败: %s", msg)
	}
	return nil
}

func (s *SystemService) GetStatus() (map[string]interface{}, error) {
	status := make(map[string]interface{})

	status["nginx_active"] = NginxActive()

	// 统一成 "nginx/1.30.7" 形式，前端一处显示、便于和公告库比对
	if version, err := DetectInstalledVersion(); err == nil {
		status["nginx_version"] = "nginx/" + version
	} else {
		status["nginx_version"] = "未安装"
	}
	status["network_traffic"] = s.collectNetworkTraffic()

	return status, nil
}

func (s *SystemService) collectNetworkTraffic() model.NetworkTraffic {
	statsDir := "/sys/class/net"
	entries, err := os.ReadDir(statsDir)
	if err != nil {
		return model.NetworkTraffic{}
	}

	var traffic model.NetworkTraffic
	for _, entry := range entries {
		if entry.Name() == "lo" {
			continue
		}
		base := filepath.Join(statsDir, entry.Name(), "statistics")
		rxPath := filepath.Join(base, "rx_bytes")
		txPath := filepath.Join(base, "tx_bytes")

		if rxBytes, err := os.ReadFile(rxPath); err == nil {
			if value, parseErr := strconv.ParseUint(strings.TrimSpace(string(rxBytes)), 10, 64); parseErr == nil {
				traffic.RXBytes += value
			}
		}
		if txBytes, err := os.ReadFile(txPath); err == nil {
			if value, parseErr := strconv.ParseUint(strings.TrimSpace(string(txBytes)), 10, 64); parseErr == nil {
				traffic.TXBytes += value
			}
		}
	}
	traffic.TotalBytes = traffic.RXBytes + traffic.TXBytes

	if s.notificationSvc != nil && s.trafficMgr != nil {
		if settings, err := s.notificationSvc.Get(); err == nil {
			if cycle, err := s.trafficMgr.Snapshot(settings, traffic.TotalBytes); err == nil {
				traffic.CycleUsedBytes = cycle.UsedBytes
				traffic.CycleLimitBytes = cycle.LimitBytes
				if !cycle.NextReset.IsZero() {
					traffic.CycleNextReset = cycle.NextReset.Format(time.RFC3339)
				}
				if !cycle.CycleStart.IsZero() {
					traffic.CycleStart = cycle.CycleStart.Format(time.RFC3339)
				}
			}
		}
	}
	return traffic
}

func (s *SystemService) applyExtractedArchive(root string) error {
	type copyTask struct {
		src  string
		dest string
	}

	var tasks []copyTask

	etcDir := filepath.Join(root, "etc", "nginx")
	varDir := filepath.Join(root, "var", "www", "html")
	altNginxDir := filepath.Join(root, "nginx")

	if dirExists(etcDir) {
		tasks = append(tasks, copyTask{src: etcDir, dest: model.ConfDir()})
	}
	if dirExists(varDir) {
		tasks = append(tasks, copyTask{src: varDir, dest: "/var/www/html"})
	}
	if dirExists(altNginxDir) && !dirExists(etcDir) {
		tasks = append(tasks, copyTask{src: altNginxDir, dest: model.ConfDir()})
	}
	if len(tasks) == 0 {
		tasks = append(tasks, copyTask{src: root, dest: model.ConfDir()})
	}

	for _, task := range tasks {
		if err := os.MkdirAll(task.dest, 0755); err != nil {
			return fmt.Errorf("创建目录失败 %s: %w", task.dest, err)
		}
		srcArg := filepath.Clean(task.src) + string(os.PathSeparator) + "."
		destArg := filepath.Clean(task.dest) + string(os.PathSeparator)
		if _, err := executor.ExecuteSimple("cp", "-a", srcArg, destArg); err != nil {
			return fmt.Errorf("复制 %s 至 %s 失败: %w", task.src, task.dest, err)
		}
	}
	return nil
}

func selectLatestBackup(dir string) (string, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return "", fmt.Errorf("读取备份目录失败: %w", err)
	}

	var (
		selected   string
		latestTime time.Time
	)

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		if !strings.HasSuffix(name, ".tar.gz") {
			continue
		}
		info, err := entry.Info()
		if err != nil {
			continue
		}
		if selected == "" || info.ModTime().After(latestTime) {
			selected = filepath.Join(dir, name)
			latestTime = info.ModTime()
		}
	}

	if selected == "" {
		return "", fmt.Errorf("未发现可用的备份文件 (目录: %s)", dir)
	}

	return selected, nil
}

func (s *SystemService) restoreFromBackup(backupFile string) error {
	if strings.TrimSpace(backupFile) == "" {
		return fmt.Errorf("未找到可用的原始备份文件")
	}
	if _, err := os.Stat(backupFile); err != nil {
		return err
	}
	_, _ = executor.ExecuteSimple("systemctl", "stop", "nginx")
	_, _ = executor.ExecuteSimple("pkill", "-9", "nginx")
	if _, err := executor.ExecuteSimple("tar", "-xzf", backupFile, "-C", "/"); err != nil {
		return err
	}
	if _, err := executor.ExecuteSimple("systemctl", "start", "nginx"); err != nil {
		return err
	}
	return nil
}

func dirExists(path string) bool {
	if path == "" {
		return false
	}
	info, err := os.Stat(path)
	if err != nil {
		return false
	}
	return info.IsDir()
}
