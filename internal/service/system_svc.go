package service

import (
	"fmt"
	"nginx-mgr/internal/executor"
	"nginx-mgr/internal/model"
	"os"
	"path/filepath"
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

func (s *SystemService) Reload() error {
	// 1. 测试配置
	if _, err := executor.ExecuteSimple(model.NginxSbinPath, "-t"); err != nil {
		return fmt.Errorf("Nginx 配置测试失败: %v", err)
	}
	// 2. 重载
	_, err := executor.ExecuteSimple("systemctl", "reload", "nginx")
	return err
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

	if _, err := executor.ExecuteSimple(model.NginxSbinPath, "-t"); err != nil {
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

	out, _ := executor.ExecuteSimple("systemctl", "is-active", "nginx")
	status["nginx_active"] = (strings.TrimSpace(out) == "active")

	version, _ := executor.ExecuteSimple(model.NginxSbinPath, "-v")
	status["nginx_version"] = strings.TrimSpace(version)
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
		tasks = append(tasks, copyTask{src: etcDir, dest: model.NginxConfDir})
	}
	if dirExists(varDir) {
		tasks = append(tasks, copyTask{src: varDir, dest: "/var/www/html"})
	}
	if dirExists(altNginxDir) && !dirExists(etcDir) {
		tasks = append(tasks, copyTask{src: altNginxDir, dest: model.NginxConfDir})
	}
	if len(tasks) == 0 {
		tasks = append(tasks, copyTask{src: root, dest: model.NginxConfDir})
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
