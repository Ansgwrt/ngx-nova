# ngx-nova

轻量级的 Nginx 可视化运维面板，内存占用 **低于 20MB**，帮助你快速完成安装、站点管理、端口转发、备份与日志查看等常见任务。

适合长期运行在 VPS / 生产环境。

---

## ✨ 功能亮点

- **极简部署**：单一 Go 二进制 + 内嵌静态前端，极低资源占用。
- **受控安装 / 升级**：内置 nginx 官方源码编译链路，固定版本 + SHA-256 校验 + PGP 验签 + 硬化编译参数，自动适配 `linux/amd64` / `linux/arm64`。
- **漏洞自检**：内嵌 nginx 官方安全公告库，打开面板即可看到当前版本命中哪些 CVE、一键升级到修复版本。
- **站点与转发管理**：图形化创建/编辑/删除站点与 Stream 转发配置，自动执行重载，失败自动回滚。
- **一键备份与恢复**：本地备份 + 每天自动备份到 Cloudflare R2。
- **日志中心**：可视化按域名聚合 Access/Error 日志。
- **HTTPS 自动化**：内置 ACME 能力，证书申请与续期全自动完成。
- **手机端可用**：抽屉式导航 + 底部标签栏，表格在窄屏自动转为卡片，适配安全区域与触摸操作。

---

## 🔐 安全基线

| 项目 | 说明 |
| --- | --- |
| 版本基线 | stable **1.30.7** / mainline **1.31.9**（随 `scripts/gen_advisories.py` 从 nginx.org 推导） |
| 源码校验 | 内嵌 SHA-256，强制校验；另用 nginx 官方 PGP 公钥验签（系统有 `gpg` 时） |
| 编译加固 | `-fstack-protector-strong`、`-D_FORTIFY_SOURCE=3`、`-fPIE`、`-Wl,-z,relro,-z,now` |
| 默认配置 | `server_tokens off`、TLS1.2/1.3、关闭 session ticket、HSTS 与常见安全响应头 |
| 面板自身 | 登录失败限流（5 次/10 分钟）、常数时间令牌比较、CSP/X-Frame-Options 等响应头、请求体大小限制 |

> 举例：仓库原先固定的 `1.28.0` 命中 **32 条**公告（其中 **4 条 major**）；升级到 `1.30.7` 后命中 **0 条**。

### 版本自检接口

```bash
curl -s http://127.0.0.1:8083/api/v1/system/version -H "Authorization: Bearer <token>"
```

返回当前版本、所属分支、受影响公告列表（CVE / 严重级别 / 影响区间 / 修复区间）与建议升级版本。

### 升级

面板「控制中心 → 版本与安全 → 一键修复升级」，或：

```bash
curl -X POST http://127.0.0.1:8083/api/v1/system/upgrade \
  -H "Authorization: Bearer <token>" -H 'Content-Type: application/json' \
  -d '{"version":"1.30.7"}'
```

若现有 nginx 编译过第三方模块（`--add-module`，如 acme / brotli），接口会拒绝并在 `hint` 里说明——因为官方源码构建不含这些模块。确认覆盖后追加 `"force":true`。

> 证书说明：检测到 ACME 模块时站点使用 `acme_certificate` 自动签发；没有时使用 `<conf>/ssl/<domain>.crt|.key`，需自行放置证书。

### 刷新漏洞库

```bash
python3 scripts/gen_advisories.py     # 重新抓取 nginx.org 生成 internal/service/advisories.json
go build .                            # 重新编译使新库生效（go:embed）
```

---

## 🚀 快速开始

### 方式一：二进制（推荐）

从 [Releases](https://github.com/Ansgwrt/ngx-nova/releases) 下载对应架构的包：

```bash
# amd64
curl -LO https://github.com/Ansgwrt/ngx-nova/releases/latest/download/nginx-mgr-linux-amd64.tar.gz
# arm64
# curl -LO https://github.com/Ansgwrt/ngx-nova/releases/latest/download/nginx-mgr-linux-arm64.tar.gz

tar -xzf nginx-mgr-linux-amd64.tar.gz
install -m755 nginx-mgr /usr/local/bin/nginx-mgr
install -m755 tokenctl /usr/local/bin/tokenctl
```

创建 systemd 服务（`/etc/systemd/system/nginx-mgr.service`）：

```ini
[Unit]
Description=nginx-mgr API/UI
After=network.target

[Service]
WorkingDirectory=/opt/nginx-mgr
ExecStart=/usr/local/bin/nginx-mgr
Restart=on-failure
RestartSec=5s
User=root
LimitNOFILE=1048576

[Install]
WantedBy=multi-user.target
```

```bash
mkdir -p /opt/nginx-mgr
systemctl daemon-reload && systemctl enable --now nginx-mgr
ufw allow 8083/tcp
```

访问 `http://IP:8083/ui/`，首次登录即设置访问令牌。

修改令牌：

```bash
tokenctl --set "你的令牌" --file /opt/nginx-mgr/auth_token.json
```

### 方式二：Docker（多架构镜像）

```bash
docker run -d --name ngx-nova \
  -p 8083:8083 -p 80:80 -p 443:443 \
  -v $PWD/data/nginx-conf:/opt/nginx/conf \
  -v $PWD/data/logs:/var/log/nginx \
  -v $PWD/data/www:/var/www/html \
  -v $PWD/data/app:/opt/nginx-mgr \
  answgrt/ngx-nova:latest
```

或使用 `docker-compose.yml`：

```bash
docker compose up -d
```

镜像内 nginx 同样由官方源码按固定校验值编译，非发行版自带的旧版本。

---

## 🧱 构建

```bash
make build       # 当前平台
make dist        # linux/amd64 + linux/arm64 二进制与 tar 包
make test        # 单测（含漏洞库与限流逻辑）
make docker      # 多架构镜像并推送（需 docker login）
```

CI（`.github/workflows/main.yml`）在每次推送时跑测试、双架构交叉编译、上传产物；打 `v*` tag 自动创建 Release；配置好 Secrets 后自动推送多架构镜像。

---

## ⚙️ 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `NGX_BIND` | `0.0.0.0:8083` | 面板监听地址，建议反代时改为 `127.0.0.1:8083` |
| `NGX_AUTH_FILE` | `./auth_token.json` | 令牌文件路径 |
| `NGX_SBIN` | 自动探测 | nginx 可执行文件路径 |
| `NGX_CONF_DIR` | 自动探测 | nginx 配置目录 |

---

## 卸载

```bash
systemctl disable --now nginx-mgr
rm -f /usr/local/bin/nginx-mgr /usr/local/bin/tokenctl
rm -rf /opt/nginx-mgr
```

---

## 设计理念

保持简单 · 拒绝"为了功能而功能" · 默认安全 · 可长期运行

## 适合谁

个人 VPS 用户 · 自建网站与反向代理 · 追求稳定、可控运维体验的开发者与运维人员
