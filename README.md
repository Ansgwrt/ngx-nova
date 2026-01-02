# nginx-mgr

轻量级的 Nginx 可视化运维面板，开箱即用的 API + Web UI，帮助你快速完成安装、站点管理、端口转发、备份与日志查看等常见任务。

## ✨ 功能亮点

- **极简部署**：单一 Go 二进制 + 静态前端，复制即可运行。

- **一键安装/卸载**：内置 nginx-acme 脚本调用，快速部署或清理 Nginx。

- **站点与转发管理**：图形化创建/编辑/删除站点与 Stream 转发配置，自动执行 `nginx -t` 与 `systemctl reload nginx`。

- **备份与恢复**：本地压缩包 + Cloudflare R2 云端能力，支持定期备份。

- **日志中心**：可视化按域名聚合 Access/Error 日志，支持刷新与独立查看。



## 🚀 快速开始

1.放行防火墙

```
ufw allow 8083/tcp
```


2. 安装脚本

```
curl -sS -O https://raw.githubusercontent.com/woniu336/open_shell/main/ngx.sh && chmod +x ngx.sh && ./ngx.sh
```

3. 登录`http://ip:8083/ui/`  首次设置登录令牌

如需修改令牌

```
tokenctl --set "你的令牌" --file /opt/nginx-mgr/auth_token.json
```

## 卸载

```
curl -sS -O https://raw.githubusercontent.com/woniu336/open_shell/main/uni-ngx.sh && chmod +x uni-ngx.sh && ./uni-ngx.sh
```

好，这里给你一版 **更克制、更“GitHub 热门工具风”** 的版本：
不使用图标、不花哨，强调 **内存占用 < 20MB**，排版留白清晰，适合直接放在 README 首页。

---

# nginx-mgr

一个轻量、可靠的 Nginx 可视化运维面板
专注于 **安全、稳定、低资源占用**

内存占用 **低于 20MB**，适合长期运行在 VPS / 生产环境

---

## 特性

不再担心 SSL 证书过期
内置 ACME 自动化能力，HTTPS 证书申请与续期全自动完成

极低资源占用
单一 Go 二进制 + 静态前端
常驻内存 < 20MB，无数据库、无后台依赖

安全优先的配置管理
每一次配置修改都会自动执行 `nginx -t`
只有校验通过才会 reload，避免误操作导致服务中断

站点与端口转发管理
支持 HTTP / HTTPS 虚拟主机
支持 Stream（TCP / UDP）端口转发与反向代理

备份与恢复
本地自动压缩备份
支持 Cloudflare R2 云端备份
可随时恢复历史配置

日志中心
按域名聚合 Access / Error 日志
支持在线查看、刷新与独立分析

---

## 设计理念

保持简单
拒绝“为了功能而功能”

默认安全
任何操作都不应该让线上服务崩溃

可长期运行
稳定、低占用、少维护

---

## 适合谁

个人 VPS 用户
自建网站与反向代理
追求稳定、可控运维体验的开发者与运维人员




