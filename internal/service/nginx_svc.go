package service

import (
	"context"
	"fmt"
	"nginx-mgr/internal/executor"
	"nginx-mgr/internal/model"
	"os"
	"strings"
	"sync/atomic"
)

type NginxService struct {
	InstallStatus *executor.TaskStatus
	running       atomic.Bool
}

func NewNginxService() *NginxService {
	return &NginxService{
		InstallStatus: &executor.TaskStatus{ID: "install"},
	}
}

// Running 用原子标志判断是否已有安装/升级任务，避免并发点击触发两次编译。
func (s *NginxService) Running() bool { return s.running.Load() }

// FullInstall 通过固定的官方源码安装 nginx（带 SHA-256 + PGP 校验、硬化编译参数）。
// 与旧版不同：不再下载并管道执行远端脚本，安装内容完全由本仓库决定，且自动适配 amd64/arm64。
// version 为空时使用 stable 通道当前修复版。
func (s *NginxService) FullInstall(ctx context.Context, version string) {
	s.runBuild(ctx, version, false)
}

// Upgrade 升级到指定版本；空字符串表示升级到当前 stable 通道最新修复版。
func (s *NginxService) Upgrade(ctx context.Context, version string, force bool) {
	if strings.TrimSpace(version) == "" {
		version = model.NginxVersion
	}
	s.runBuild(ctx, version, force)
}

func (s *NginxService) runBuild(ctx context.Context, version string, force bool) {
	if !s.running.CompareAndSwap(false, true) {
		return
	}
	defer s.running.Store(false)

	version = strings.TrimSpace(version)
	if version == "" {
		version = model.NginxVersion
	}
	status := &executor.TaskStatus{ID: "install"}
	s.InstallStatus = status
	status.IsRunning = true

	defer func() {
		status.IsRunning = false
	}()

	status.AddLog(">>> 检查 Nginx 安装状态")
	status.AddLog(fmt.Sprintf(">>> 目标版本: %s (stable 通道当前修复版 %s / mainline %s)",
		version, model.NginxStableVersion, model.NginxMainlineVersion))

	if current, err := DetectInstalledVersion(); err == nil {
		status.AddLog(">>> 当前已安装版本: " + current)
		if report := CheckNginxVersion(current); report.Vulnerable {
			status.AddLog(fmt.Sprintf("!!! 当前版本命中 %d 条安全公告，其中 major %d 条",
				report.TotalAffected, report.MajorCount))
		}
	}

	if err := BuildNginxFromSource(ctx, status, NginxBuildOptions{Version: version, Force: force}); err != nil {
		status.ExitCode = 1
		status.AddLog(fmt.Sprintf("!!! 安装失败: %v", err))
		return
	}
	model.ResetPathCache()
	model.DetectNginxFeatures()
	status.ExitCode = 0
	status.AddLog("=== Nginx 安装/升级完成 ===")
}

// VersionReport 读取实测版本并做漏洞比对。
func (s *NginxService) VersionReport() VersionReport {
	installed, err := DetectInstalledVersion()
	if err != nil {
		report := CheckNginxVersion("")
		report.Summary = "未检测到已安装的 Nginx（或不在标准路径），可直接安装 " + report.LatestStable + "。"
		return report
	}
	return CheckNginxVersion(installed)
}

func isNginxInstalled() bool {
	sbin := model.SbinPath()
	if _, err := os.Stat(sbin); err != nil {
		return false
	}
	if _, err := executor.ExecuteSimple(sbin, "-v"); err != nil {
		return false
	}
	if _, err := os.Stat(model.ConfDir()); err != nil {
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
