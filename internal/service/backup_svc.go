package service

import (
	"encoding/json"
	"errors"
	"fmt"
	"nginx-mgr/internal/executor"
	"nginx-mgr/internal/model"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

type BackupService struct {
	rcloneConfigPath string
	backupConfigPath string
	backupScriptPath string
	backupDir        string
	rcloneRemote     string
}

var ErrRcloneRemoteNotConfigured = errors.New("Cloudflare R2 未配置")

type R2SetupRequest struct {
	AccessKey  string `json:"access_key"`
	SecretKey  string `json:"secret_key"`
	Endpoint   string `json:"endpoint"`
	SourceDir  string `json:"source_dir"`
	RemotePath string `json:"remote_path"`
	SkipBackup bool   `json:"skip_initial_backup"`
}

type BackupStatus struct {
	RcloneConfigured bool   `json:"rclone_configured"`
	BackupConfigured bool   `json:"backup_configured"`
	SourceDir        string `json:"source_dir"`
	RemotePath       string `json:"remote_path"`
	AccessKey        string `json:"access_key"`
	Endpoint         string `json:"endpoint"`
	HasSecret        bool   `json:"has_secret"`
}

type backupConfig struct {
	SourceDir  string
	RemotePath string
}

type rcloneConfig struct {
	AccessKey string
	SecretKey string
	Endpoint  string
}

func (s *BackupService) loadRcloneConfig() (*rcloneConfig, error) {
	data, err := os.ReadFile(s.rcloneConfigPath)
	if err != nil {
		return nil, err
	}
	lines := strings.Split(string(data), "\n")
	targetSection := fmt.Sprintf("[%s]", s.rcloneRemote)
	inSection := false
	found := false
	cfg := &rcloneConfig{}
	for _, line := range lines {
		trim := strings.TrimSpace(line)
		if trim == "" || strings.HasPrefix(trim, "#") || strings.HasPrefix(trim, ";") {
			continue
		}
		if strings.HasPrefix(trim, "[") && strings.HasSuffix(trim, "]") {
			inSection = trim == targetSection
			if inSection {
				found = true
			}
			continue
		}
		if !inSection {
			continue
		}
		parts := strings.SplitN(trim, "=", 2)
		if len(parts) != 2 {
			continue
		}
		key := strings.TrimSpace(parts[0])
		val := strings.TrimSpace(parts[1])
		switch key {
		case "access_key_id":
			cfg.AccessKey = val
		case "secret_access_key":
			cfg.SecretKey = val
		case "endpoint":
			cfg.Endpoint = val
		}
	}
	if !found {
		return nil, ErrRcloneRemoteNotConfigured
	}
	return cfg, nil
}

func NewBackupService() *BackupService {
	return &BackupService{
		rcloneConfigPath: "/root/.config/rclone/rclone.conf",
		backupConfigPath: "/root/backup_config.conf",
		backupScriptPath: "/root/website_backup.py",
		backupDir:        "/root/nginx_backups",
		rcloneRemote:     "r2",
	}
}

func (s *BackupService) SetupR2(req R2SetupRequest) (time.Time, bool, error) {
	if err := s.ensureTools(); err != nil {
		return time.Time{}, false, err
	}
	accessKey := strings.TrimSpace(req.AccessKey)
	secret := strings.TrimSpace(req.SecretKey)
	endpoint := strings.TrimSpace(req.Endpoint)
	shouldConfigure := accessKey != "" || secret != "" || endpoint != ""
	if shouldConfigure {
		if accessKey == "" || secret == "" || endpoint == "" {
			return time.Time{}, false, errors.New("Cloudflare R2 凭证不能为空")
		}
		if err := s.configureRclone(accessKey, secret, endpoint); err != nil {
			return time.Time{}, false, err
		}
	} else {
		if _, err := s.loadRcloneConfig(); err != nil {
			if errors.Is(err, os.ErrNotExist) || errors.Is(err, ErrRcloneRemoteNotConfigured) {
				return time.Time{}, false, errors.New("尚未配置 Cloudflare R2 凭证，请填写后保存")
			}
			return time.Time{}, false, err
		}
	}
	if err := s.testRclone(); err != nil {
		return time.Time{}, false, err
	}
	if err := s.ensureBackupAssets(req.SourceDir, req.RemotePath); err != nil {
		return time.Time{}, false, err
	}

	var firstBackup bool
	if !req.SkipBackup {
		if err := s.RunBackup(); err != nil {
			return time.Time{}, false, fmt.Errorf("执行首次备份失败: %w", err)
		}
		firstBackup = true
	}

	if err := s.ensureCron(); err != nil {
		return time.Time{}, firstBackup, err
	}

	cfg, err := s.loadBackupConfig()
	if err != nil {
		return time.Time{}, firstBackup, err
	}

	if err := s.verifyRemote(cfg); err != nil {
		return time.Time{}, firstBackup, err
	}

	return time.Now().Add(24 * time.Hour), firstBackup, nil
}

func (s *BackupService) RunBackup() error {
	if _, err := os.Stat(s.backupScriptPath); err != nil {
		return errors.New("备份脚本不存在，请先完成 R2 配置")
	}
	cfg, err := s.loadBackupConfig()
	if err != nil {
		return err
	}
	if cfg.RemotePath == "" {
		return errors.New("未配置远程存储路径")
	}
	cmd := fmt.Sprintf("cd %s && /usr/bin/python3 %s", filepath.Dir(s.backupScriptPath), s.backupScriptPath)
	out, err := executor.ExecuteSimple("bash", "-c", cmd)
	if err != nil {
		msg := strings.TrimSpace(out)
		if msg == "" {
			msg = err.Error()
		}
		return fmt.Errorf("备份脚本执行失败: %s", msg)
	}
	return s.verifyRemote(cfg)
}

func (s *BackupService) RestoreLatest(remote string) error {
	cfg, err := s.loadBackupConfig()
	if err != nil && !errors.Is(err, os.ErrNotExist) {
		return err
	}

	remotePath := strings.TrimSpace(remote)
	if remotePath == "" && cfg.RemotePath != "" {
		remotePath = fmt.Sprintf("%s:%s", s.rcloneRemote, strings.Trim(cfg.RemotePath, "/"))
	} else if remotePath == "" {
		return errors.New("请提供 R2 存储路径")
	} else if !strings.Contains(remotePath, ":") {
		remotePath = fmt.Sprintf("%s:%s", s.rcloneRemote, strings.Trim(remotePath, "/"))
	}

	listJSON, err := executor.ExecuteSimple("rclone", "lsjson", remotePath)
	if err != nil {
		return fmt.Errorf("获取备份列表失败: %w", err)
	}

	type entry struct {
		Name    string    `json:"Name"`
		IsDir   bool      `json:"IsDir"`
		ModTime time.Time `json:"ModTime"`
		Size    int64     `json:"Size"`
	}
	var entries []entry
	if err := json.Unmarshal([]byte(listJSON), &entries); err != nil {
		return fmt.Errorf("解析备份列表失败: %w", err)
	}

	var latest entry
	for _, e := range entries {
		if e.IsDir || !strings.HasSuffix(e.Name, ".tar.gz") {
			continue
		}
		if latest.Name == "" || e.ModTime.After(latest.ModTime) {
			latest = e
		}
	}
	if latest.Name == "" {
		return errors.New("未找到 .tar.gz 备份文件")
	}

	tempDir, err := os.MkdirTemp("", "r2_restore")
	if err != nil {
		return err
	}
	defer os.RemoveAll(tempDir)

	remoteFile := fmt.Sprintf("%s/%s", strings.TrimRight(remotePath, "/"), latest.Name)
	localFile := filepath.Join(tempDir, latest.Name)
	if _, err := executor.ExecuteSimple("rclone", "copyto", remoteFile, localFile); err != nil {
		return fmt.Errorf("下载备份文件失败: %w", err)
	}

	systemSvc := NewSystemService(nil, nil)
	return systemSvc.Restore(localFile)
}

func (s *BackupService) Status() (*BackupStatus, error) {
	status := &BackupStatus{}
	if rcloneCfg, err := s.loadRcloneConfig(); err == nil {
		if rcloneCfg.AccessKey != "" || rcloneCfg.Endpoint != "" || rcloneCfg.SecretKey != "" {
			status.RcloneConfigured = true
		}
		status.AccessKey = rcloneCfg.AccessKey
		status.Endpoint = rcloneCfg.Endpoint
		status.HasSecret = rcloneCfg.SecretKey != ""
	}
	cfg, err := s.loadBackupConfig()
	if err == nil {
		status.BackupConfigured = true
		status.SourceDir = cfg.SourceDir
		status.RemotePath = cfg.RemotePath
	}
	return status, nil
}

func (s *BackupService) ensureTools() error {
	var missing []string
	if _, err := exec.LookPath("pigz"); err != nil {
		missing = append(missing, "pigz")
	}
	if _, err := exec.LookPath("python3"); err != nil {
		missing = append(missing, "python3")
	}
	if len(missing) > 0 {
		pkgs := strings.Join(missing, " ")
		if _, err := executor.ExecuteSimple("bash", "-c", fmt.Sprintf("apt-get update >/dev/null 2>&1 && apt-get install -y %s >/dev/null 2>&1", pkgs)); err != nil {
			return fmt.Errorf("安装依赖失败: %w", err)
		}
	}
	if _, err := exec.LookPath("rclone"); err != nil {
		if _, err := executor.ExecuteSimple("bash", "-c", "curl -fsSL https://rclone.org/install.sh | bash >/dev/null 2>&1"); err != nil {
			return fmt.Errorf("安装 rclone 失败: %w", err)
		}
	}
	return nil
}

func (s *BackupService) configureRclone(accessKey, secret, endpoint string) error {
	if accessKey == "" || secret == "" || endpoint == "" {
		return errors.New("Cloudflare R2 凭证不能为空")
	}
	configDir := filepath.Dir(s.rcloneConfigPath)
	if err := os.MkdirAll(configDir, 0700); err != nil {
		return err
	}
	content := fmt.Sprintf(`[r2]
type = s3
provider = Cloudflare
access_key_id = %s
secret_access_key = %s
region = auto
endpoint = %s
`, accessKey, secret, endpoint)
	if err := os.WriteFile(s.rcloneConfigPath, []byte(content), 0600); err != nil {
		return err
	}
	return nil
}

func (s *BackupService) testRclone() error {
	if _, err := executor.ExecuteSimple("bash", "-c", fmt.Sprintf("timeout 10 rclone lsjson %s: >/dev/null 2>&1", s.rcloneRemote)); err != nil {
		return fmt.Errorf("rclone 连接测试失败: %w", err)
	}
	return nil
}

func (s *BackupService) TestConnection() error {
	if _, err := s.loadRcloneConfig(); err != nil {
		if errors.Is(err, os.ErrNotExist) || errors.Is(err, ErrRcloneRemoteNotConfigured) {
			return errors.New("尚未配置 Cloudflare R2 凭证")
		}
		return err
	}
	return s.testRclone()
}

func (s *BackupService) ensureBackupAssets(sourceDir, remotePath string) error {
	if err := os.MkdirAll(s.backupDir, 0755); err != nil {
		return err
	}
	scriptDir := filepath.Dir(s.backupScriptPath)
	if err := os.MkdirAll(scriptDir, 0755); err != nil {
		return err
	}
	if _, err := os.Stat(s.backupScriptPath); os.IsNotExist(err) {
		if _, err := executor.ExecuteSimple("wget", "-q", "-O", s.backupScriptPath, "https://raw.githubusercontent.com/woniu336/open_shell/main/website_backup.py"); err != nil {
			return fmt.Errorf("下载备份脚本失败: %w", err)
		}
	}
	if _, err := os.Stat(s.backupConfigPath); os.IsNotExist(err) {
		if _, err := executor.ExecuteSimple("wget", "-q", "-O", s.backupConfigPath, "https://raw.githubusercontent.com/woniu336/open_shell/main/backup_config.conf"); err != nil {
			return fmt.Errorf("下载备份配置失败: %w", err)
		}
	}
	_ = os.Chmod(s.backupScriptPath, 0755)
	_ = os.Chmod(s.backupConfigPath, 0644)
	return s.updateBackupConfig(sourceDir, remotePath)
}

func (s *BackupService) updateBackupConfig(sourceDir, remotePath string) error {
	sourceDir = strings.TrimSpace(sourceDir)
	if sourceDir == "" {
		sourceDir = model.NginxConfDir
	}
	remotePath = strings.Trim(strings.TrimSpace(remotePath), "/")
	if remotePath == "" {
		return errors.New("R2 存储路径不能为空")
	}
	data, err := os.ReadFile(s.backupConfigPath)
	if err != nil {
		return err
	}
	lines := strings.Split(string(data), "\n")
	var (
		hasSource bool
		hasRemote bool
	)
	for i, line := range lines {
		trim := strings.TrimSpace(line)
		if strings.HasPrefix(trim, "source_dir") {
			lines[i] = fmt.Sprintf("source_dir = %s", sourceDir)
			hasSource = true
		}
		if strings.HasPrefix(trim, "remote_path") {
			lines[i] = fmt.Sprintf("remote_path = %s", remotePath)
			hasRemote = true
		}
	}
	if !hasSource {
		lines = append(lines, fmt.Sprintf("source_dir = %s", sourceDir))
	}
	if !hasRemote {
		lines = append(lines, fmt.Sprintf("remote_path = %s", remotePath))
	}
	content := strings.Join(lines, "\n")
	return os.WriteFile(s.backupConfigPath, []byte(content), 0644)
}

func (s *BackupService) ensureCron() error {
	current, err := executor.ExecuteSimple("bash", "-c", "crontab -l 2>/dev/null || true")
	if err != nil {
		return err
	}
	if strings.Contains(current, "website_backup.py") {
		return nil
	}
	newContent := strings.TrimSpace(current)
	if newContent != "" && !strings.HasSuffix(newContent, "\n") {
		newContent += "\n"
	}
	newContent += "0 2 * * * /usr/bin/python3 /root/website_backup.py\n"

	tempFile, err := os.CreateTemp("", "cron")
	if err != nil {
		return err
	}
	defer os.Remove(tempFile.Name())
	if _, err := tempFile.WriteString(newContent); err != nil {
		return err
	}
	if err := tempFile.Close(); err != nil {
		return err
	}
	if _, err := executor.ExecuteSimple("crontab", tempFile.Name()); err != nil {
		return fmt.Errorf("设置定时任务失败: %w", err)
	}
	return nil
}

func (s *BackupService) verifyRemote(cfg *backupConfig) error {
	remote := fmt.Sprintf("%s:%s", s.rcloneRemote, strings.Trim(cfg.RemotePath, "/"))
	if _, err := executor.ExecuteSimple("bash", "-c", fmt.Sprintf("rclone ls %s 2>/dev/null | head -5", escapePath(remote))); err != nil {
		return fmt.Errorf("验证备份文件失败: %w", err)
	}
	return nil
}

func (s *BackupService) loadBackupConfig() (*backupConfig, error) {
	data, err := os.ReadFile(s.backupConfigPath)
	if err != nil {
		return nil, err
	}
	cfg := &backupConfig{}
	lines := strings.Split(string(data), "\n")
	for _, line := range lines {
		trim := strings.TrimSpace(line)
		if strings.HasPrefix(trim, "source_dir") {
			cfg.SourceDir = strings.TrimSpace(strings.TrimPrefix(trim, "source_dir ="))
		}
		if strings.HasPrefix(trim, "remote_path") {
			cfg.RemotePath = strings.TrimSpace(strings.TrimPrefix(trim, "remote_path ="))
		}
	}
	if cfg.SourceDir == "" {
		cfg.SourceDir = model.NginxConfDir
	}
	return cfg, nil
}

func escapePath(path string) string {
	return strings.ReplaceAll(path, "'", `'"'"'`)
}
