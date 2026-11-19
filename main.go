package main

import (
	"context"
	"embed"
	"errors"
	"io/fs"
	"net/http"
	"nginx-mgr/internal/model"
	"nginx-mgr/internal/service"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

//go:embed web/static/*
var staticFS embed.FS

func main() {
	r := gin.Default()
	// 面板自身不反代，不信任任何 X-Forwarded-For，避免限流被伪造 IP 绕过。
	_ = r.SetTrustedProxies(nil)
	r.Use(securityHeaders())
	r.Use(bodyLimit(2 << 20)) // 原始配置编辑上限 2MB

	nginxSvc := service.NewNginxService()
	// 探测 nginx 是否带 brotli / acme 模块，决定站点模板能写哪些指令
	model.DetectNginxFeatures()
	siteSvc := service.NewSiteService()
	streamSvc := service.NewStreamService()
	notificationSvc := service.NewNotificationService()
	trafficMgr := service.NewTrafficUsageManager("")
	systemSvc := service.NewSystemService(notificationSvc, trafficMgr)
	backupSvc := service.NewBackupService()
	authPath := strings.TrimSpace(os.Getenv("NGX_AUTH_FILE"))
	if authPath == "" {
		authPath = filepath.Join(".", "auth_token.json")
	}
	authMgr, err := service.NewAuthManager(authPath)
	if err != nil {
		panic(err)
	}
	limiter := service.NewLoginLimiter(5, 10*time.Minute)

	notifier := service.NewNotificationDispatcher(notificationSvc, trafficMgr)
	go notifier.Start(context.Background())

	r.POST("/api/v1/auth/login", func(c *gin.Context) {
		clientKey := c.ClientIP()
		if ok, wait := limiter.Allow(clientKey); !ok {
			c.Header("Retry-After", strconv.Itoa(int(wait.Seconds())+1))
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "登录失败次数过多，请稍后再试",
			})
			return
		}

		var req struct {
			Token string `json:"token"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		token := strings.TrimSpace(req.Token)
		if token == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "登录令牌不能为空"})
			return
		}
		if len(token) < 8 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "登录令牌至少 8 位"})
			return
		}

		expireAt, created, err := authMgr.Login(token)
		if err != nil {
			limiter.Fail(clientKey)
			switch {
			case errors.Is(err, service.ErrTokenMismatch):
				c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			default:
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			}
			return
		}
		limiter.Reset(clientKey)

		msg := "登录成功"
		if created {
			msg = "登录令牌已创建并启用"
		}

		c.JSON(http.StatusOK, gin.H{
			"message":    msg,
			"expires_at": expireAt.Format(time.RFC3339),
			"new_token":  created,
		})
	})

	apiV1 := r.Group("/api/v1")
	apiV1.Use(authMiddleware(authMgr))

	// 1. 安装接口
	apiV1.POST("/install", func(c *gin.Context) {
		if nginxSvc.Running() {
			c.JSON(http.StatusConflict, gin.H{"error": "安装任务正在运行中"})
			return
		}
		var req struct {
			Version string `json:"version"`
		}
		_ = c.ShouldBindJSON(&req) // 版本可选，缺省走 stable 通道
		version := strings.TrimSpace(req.Version)
		go nginxSvc.FullInstall(context.Background(), version)
		c.JSON(http.StatusAccepted, gin.H{
			"message": "安装任务已启动",
			"version": version,
		})
	})

	apiV1.GET("/install/logs", func(c *gin.Context) {
		c.JSON(http.StatusOK, nginxSvc.InstallStatus)
	})

	// 1.1 版本与漏洞自检
	apiV1.GET("/system/version", func(c *gin.Context) {
		c.JSON(http.StatusOK, nginxSvc.VersionReport())
	})

	apiV1.POST("/system/upgrade", func(c *gin.Context) {
		if nginxSvc.Running() {
			c.JSON(http.StatusConflict, gin.H{"error": "已有安装/升级任务在运行"})
			return
		}
		var req struct {
			Version string `json:"version"`
			Force   bool   `json:"force"`
		}
		_ = c.ShouldBindJSON(&req)
		version := strings.TrimSpace(req.Version)
		// 现有 nginx 带第三方模块时，先同步告知，避免任务启动后才在日志里失败
		if reason := service.DetectThirdPartyModules(); reason != "" && !req.Force {
			c.JSON(http.StatusConflict, gin.H{
				"error":  "现有 nginx 编译了第三方模块（" + reason + "），官方源码构建不包含它们",
				"hint":   "确认覆盖请带 force=true 重试，或使用发行版包管理器升级 nginx",
				"reason": reason,
			})
			return
		}
		if version != "" {
			if !service.IsValidNginxVersion(version) {
				c.JSON(http.StatusBadRequest, gin.H{"error": "非法的版本号: " + version})
				return
			}
		}
		go nginxSvc.Upgrade(context.Background(), version, req.Force)
		c.JSON(http.StatusAccepted, gin.H{"message": "升级任务已启动", "version": version})
	})

	// 2. 站点管理
	apiV1.GET("/sites", func(c *gin.Context) {
		sites, err := siteSvc.ListSites()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, sites)
	})

	apiV1.GET("/sites/details", func(c *gin.Context) {
		configs, err := siteSvc.ListSiteConfigs()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, configs)
	})

	apiV1.GET("/sites/:domain", func(c *gin.Context) {
		domain := c.Param("domain")
		config, err := siteSvc.GetSite(domain)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, config)
	})

	apiV1.GET("/sites/:domain/raw", func(c *gin.Context) {
		domain := c.Param("domain")
		content, err := siteSvc.ReadSiteRaw(domain)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"content": content})
	})

	apiV1.POST("/sites", func(c *gin.Context) {
		var config model.SiteConfig
		if err := c.ShouldBindJSON(&config); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if err := siteSvc.CreateSite(config); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		if err := systemSvc.Reload(); err != nil {
			_ = siteSvc.DeleteSite(config.Domain)
			_ = systemSvc.Reload()
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "rolled_back": true})
			return
		}
		c.JSON(http.StatusCreated, gin.H{"message": "站点创建成功"})
	})

	apiV1.PUT("/sites/:domain", func(c *gin.Context) {
		var config model.SiteConfig
		if err := c.ShouldBindJSON(&config); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		domain := c.Param("domain")
		if config.Domain == "" {
			config.Domain = domain
		} else if config.Domain != domain {
			c.JSON(http.StatusBadRequest, gin.H{"error": "域名与请求路径不匹配"})
			return
		}
		prevContent, err := siteSvc.ReadSiteRaw(domain)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		if err := siteSvc.CreateSite(config); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		if err := systemSvc.Reload(); err != nil {
			_ = siteSvc.WriteSiteRaw(domain, prevContent)
			_ = systemSvc.Reload()
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "rolled_back": true})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "站点更新成功"})
	})

	apiV1.PUT("/sites/:domain/raw", func(c *gin.Context) {
		domain := c.Param("domain")
		var req struct {
			Content string `json:"content"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		prevContent, err := siteSvc.ReadSiteRaw(domain)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		if err := siteSvc.WriteSiteRaw(domain, req.Content); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		if err := systemSvc.Reload(); err != nil {
			_ = siteSvc.WriteSiteRaw(domain, prevContent)
			_ = systemSvc.Reload()
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "rolled_back": true})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "配置已更新并重载"})
	})

	apiV1.DELETE("/sites/:domain", func(c *gin.Context) {
		domain := c.Param("domain")
		prevContent, err := siteSvc.ReadSiteRaw(domain)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		if err := siteSvc.DeleteSite(domain); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		if err := systemSvc.Reload(); err != nil {
			if restoreErr := siteSvc.RestoreSiteRaw(domain, prevContent); restoreErr == nil {
				_ = systemSvc.Reload()
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "rolled_back": true})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "站点已删除"})
	})

	// 3. 端口转发管理
	apiV1.GET("/streams", func(c *gin.Context) {
		streams, err := streamSvc.ListStreams()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, streams)
	})

	apiV1.GET("/streams/details", func(c *gin.Context) {
		configs, err := streamSvc.ListStreamConfigs()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, configs)
	})

	apiV1.GET("/streams/:name", func(c *gin.Context) {
		name := c.Param("name")
		config, err := streamSvc.GetStream(name)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, config)
	})

	apiV1.GET("/streams/:name/raw", func(c *gin.Context) {
		name := c.Param("name")
		content, err := streamSvc.ReadStreamRaw(name)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"content": content})
	})

	apiV1.POST("/streams", func(c *gin.Context) {
		var config model.StreamConfig
		if err := c.ShouldBindJSON(&config); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if err := streamSvc.CreateStream(config); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		if err := systemSvc.Reload(); err != nil {
			_ = streamSvc.DeleteStream(config.Name)
			_ = systemSvc.Reload()
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "rolled_back": true})
			return
		}
		c.JSON(http.StatusCreated, gin.H{"message": "转发规则创建成功"})
	})

	apiV1.PUT("/streams/:name", func(c *gin.Context) {
		name := c.Param("name")
		backup, err := streamSvc.GetStream(name)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		var config model.StreamConfig
		if err := c.ShouldBindJSON(&config); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if config.Name == "" {
			config.Name = name
		} else if config.Name != name {
			c.JSON(http.StatusBadRequest, gin.H{"error": "名称与请求路径不匹配"})
			return
		}
		if err := streamSvc.CreateStream(config); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		if err := systemSvc.Reload(); err != nil {
			_ = streamSvc.CreateStream(*backup)
			_ = systemSvc.Reload()
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "rolled_back": true})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "转发规则已更新"})
	})

	apiV1.DELETE("/streams/:name", func(c *gin.Context) {
		name := c.Param("name")
		backup, err := streamSvc.GetStream(name)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		if err := streamSvc.DeleteStream(name); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		if err := systemSvc.Reload(); err != nil {
			_ = streamSvc.CreateStream(*backup)
			_ = systemSvc.Reload()
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "rolled_back": true})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "转发规则已删除"})
	})

	apiV1.PUT("/streams/:name/raw", func(c *gin.Context) {
		name := c.Param("name")
		prevContent, err := streamSvc.ReadStreamRaw(name)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		var req struct {
			Content string `json:"content"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if err := streamSvc.WriteStreamRaw(name, req.Content); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		if err := systemSvc.Reload(); err != nil {
			_ = streamSvc.WriteStreamRaw(name, prevContent)
			_ = systemSvc.Reload()
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "rolled_back": true})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "转发配置已更新"})
	})

	// 4. 系统运维
	apiV1.POST("/system/reload", func(c *gin.Context) {
		if err := systemSvc.Reload(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Nginx 已重载"})
	})

	apiV1.POST("/system/backup", func(c *gin.Context) {
		path, err := systemSvc.Backup()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "备份成功", "path": path})
	})

	apiV1.POST("/system/restore", func(c *gin.Context) {
		var req struct {
			Path string `json:"path"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if err := systemSvc.Restore(req.Path); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "恢复成功"})
	})

	apiV1.POST("/system/uninstall", func(c *gin.Context) {
		if err := systemSvc.Uninstall(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "卸载成功"})
	})

	apiV1.GET("/system/status", func(c *gin.Context) {
		status, _ := systemSvc.GetStatus()
		c.JSON(http.StatusOK, status)
	})

	apiV1.GET("/system/site-logs", func(c *gin.Context) {
		logs, err := siteSvc.CollectTodayLogs(200)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, logs)
	})

	// 5. 通知设置
	apiV1.GET("/settings/notifications", func(c *gin.Context) {
		settings, err := notificationSvc.Get()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, settings)
	})

	apiV1.PUT("/settings/notifications", func(c *gin.Context) {
		var req model.NotificationSettings
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		saved, err := notificationSvc.Save(req)
		if err != nil {
			if errors.Is(err, service.ErrInvalidExpiryDateFormat) {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, saved)
	})

	// 6. 备份与恢复
	apiV1.GET("/backup/status", func(c *gin.Context) {
		status, err := backupSvc.Status()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, status)
	})

	apiV1.POST("/backup/setup", func(c *gin.Context) {
		var req service.R2SetupRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		nextCheck, firstBackup, err := backupSvc.SetupR2(req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		payload := gin.H{
			"message":      "Cloudflare R2 配置成功",
			"first_backup": firstBackup,
		}
		if !nextCheck.IsZero() {
			payload["next_check_at"] = nextCheck.Format(time.RFC3339)
		}
		c.JSON(http.StatusOK, payload)
	})

	apiV1.POST("/backup/run", func(c *gin.Context) {
		if err := backupSvc.RunBackup(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "备份任务已执行"})
	})

	apiV1.POST("/backup/test", func(c *gin.Context) {
		if err := backupSvc.TestConnection(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "与 Cloudflare R2 连接正常"})
	})

	apiV1.POST("/backup/restore", func(c *gin.Context) {
		var req struct {
			RemotePath string `json:"remote_path"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if err := backupSvc.RestoreLatest(req.RemotePath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "恢复成功"})
	})

	// 5. 静态资源服务
	subFS, _ := fs.Sub(staticFS, "web/static")
	r.StaticFS("/ui", http.FS(subFS))

	// 根目录重定向到 UI
	r.GET("/", func(c *gin.Context) {
		c.Redirect(http.StatusMovedPermanently, "/ui/")
	})

	addr := strings.TrimSpace(os.Getenv("NGX_BIND"))
	if addr == "" {
		addr = "0.0.0.0:8083"
	}
	if err := r.Run(addr); err != nil {
		panic(err)
	}
}

// securityHeaders 给面板自身补一层响应头，降低被嵌入、被嗅探、被降级的风险。
//
// 关于 script-src 里的 'unsafe-eval'：本面板前端是 Vue 3 CDN 构建版 + Tailwind Play CDN，
// 两者都在浏览器里编译模板/生成样式，内部使用 new Function()，没有 'unsafe-eval' 会直接抛
// EvalError，导致 #app 停在 v-cloak 状态、页面全黑。这是当前前端形态的硬约束。
// 若后续把模板预编译（或换 runtime-only + 编译期产物、Tailwind 改为构建期产出 CSS），
// 即可移除 'unsafe-eval'，CSP 也能收紧到 'self' + 明确 CDN 白名单。
func securityHeaders() gin.HandlerFunc {
	const csp = "default-src 'self'; " +
		"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.tailwindcss.com; " +
		"style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com; " +
		"font-src 'self' data: https://cdnjs.cloudflare.com https://fonts.gstatic.com; " +
		"img-src 'self' data:; " +
		"connect-src 'self'; " +
		"frame-ancestors 'none'; base-uri 'self'; form-action 'self'"

	return func(c *gin.Context) {
		h := c.Writer.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Referrer-Policy", "no-referrer")
		h.Set("Content-Security-Policy", csp)
		h.Set("Cross-Origin-Opener-Policy", "same-origin")
		if strings.HasPrefix(c.Request.URL.Path, "/api/") {
			h.Set("Cache-Control", "no-store")
		}
		c.Next()
	}
}

// bodyLimit 限制请求体大小，避免用超大 JSON 把进程内存打满。
func bodyLimit(maxBytes int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Body != nil {
			c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes)
		}
		c.Next()
	}
}

func authMiddleware(authMgr *service.AuthManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := strings.TrimSpace(c.GetHeader("Authorization"))
		if header == "" || !strings.HasPrefix(header, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "未授权"})
			return
		}

		token := strings.TrimSpace(strings.TrimPrefix(header, "Bearer "))
		if token == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "未授权"})
			return
		}

		if err := authMgr.Validate(token); err != nil {
			resp := gin.H{"error": err.Error()}
			if errors.Is(err, service.ErrTokenExpired) {
				resp["expired"] = true
			}
			if errors.Is(err, service.ErrTokenNotSet) {
				resp["not_set"] = true
			}
			c.AbortWithStatusJSON(http.StatusUnauthorized, resp)
			return
		}
		c.Next()
	}
}
