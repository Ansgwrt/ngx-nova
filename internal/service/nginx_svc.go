package service

import (
	"context"
	"fmt"
	"nginx-mgr/internal/executor"
	"nginx-mgr/internal/model"
	"os"
	"strings"
)

type NginxService struct {
	InstallStatus *executor.TaskStatus
}

func NewNginxService() *NginxService {
	return &NginxService{
		InstallStatus: &executor.TaskStatus{ID: "install"},
	}
}

func (s *NginxService) FullInstall(ctx context.Context) {
	status := &executor.TaskStatus{ID: "install"}
	s.InstallStatus = status

	status.AddLog(">>> 检查 Nginx 安装状态")
	if isNginxInstalled() {
		status.AddLog("Nginx 已安装，跳过重复安装。如需重新部署请先执行卸载。")
		return
	}

	status.AddLog(">>> 下载并执行 nginx-acme 安装脚本 (菜单 1)")
	cmd := buildAcmeScriptCommand([]string{"1", "", "0"})
	if err := executor.ExecuteCommand(ctx, status, "bash", "-c", cmd); err != nil {
		status.AddLog(fmt.Sprintf("!!! 错误: 安装脚本执行失败: %v", err))
		return
	}
	status.AddLog("=== Nginx 安装脚本执行完成 ===")
}

func isNginxInstalled() bool {
	if _, err := os.Stat(model.NginxSbinPath); err != nil {
		return false
	}
	if _, err := executor.ExecuteSimple(model.NginxSbinPath, "-v"); err != nil {
		return false
	}
	if _, err := os.Stat(model.NginxConfDir); err != nil {
		return false
	}
	if out, err := executor.ExecuteSimple("systemctl", "status", "nginx"); err != nil {
		lower := strings.ToLower(out)
		if strings.Contains(lower, "could not be found") || strings.Contains(lower, "not-found") {
			return false
		}
	}
	return true
}
