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

> TLS 会话缓存 `shared:SSL` 属于全局共享内存区，只在 `http{}` 里声明一次（裸机基线见 `internal/service/nginx_build.go`，容器见 `docker/nginx.conf`），站点模板不再注入。若你在自定义的 `nginx.conf` 里改了尺寸（如 `30m`），务必保证整份配置里只有这一个尺寸——同名 zone 重复声明且尺寸不同，`nginx -t` 会直接 `[emerg] the size ... conflicts with already declared size ...`。

### 版本自检接口

```bash
curl -s http://127.0.0.1:8083/api/v1/system/version -H "Authorization: Bearer <token>"
```

返回当前版本、所属分支、受影响公告列表（CVE / 严重级别 / 影响区间 / 修复区间）与建议升级版本。

### 面板内一键升级

面板「控制中心 → 版本与安全 → 一键修复升级」，或：

```bash
curl -X POST http://127.0.0.1:8083/api/v1/system/upgrade \
  -H "Authorization: Bearer <token>" -H 'Content-Type: application/json' \
  -d '{"version":"1.30.7"}'
```

若现有 nginx 编译过第三方模块（`--add-module`，如 acme / brotli），接口会拒绝并在 `hint` 里说明——因为官方源码构建不含这些模块。确认覆盖后追加 `"force":true`。

> 想脱离面板、脚本化升级（保留第三方模块 + 面板自更新 + 失败回滚），见下面的「升级与回滚」。

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

> CI 默认推送到 **GHCR**（`ghcr.io/ansgwrt/ngx-nova`），用的是仓库内置 `GITHUB_TOKEN`，无需任何手配密钥；配置了 `DOCKERHUB_USERNAME` / `DOCKERHUB_TOKEN` 后才会额外推 Docker Hub。GHCR 包首次创建后需在 Packages 设置里改为 Public 才能匿名拉取。

---

## ⬆️ 升级与回滚（`scripts/upgrade-nginx.sh`）

不依赖面板的升级工具，适合脚本化运维、批量机器，以及面板自身也要跟着升级的场景。
它只替换二进制与动态模块，**不执行 `make install`，不覆盖任何站点配置**。

```bash
curl -fsSLO https://raw.githubusercontent.com/Ansgwrt/ngx-nova/main/scripts/upgrade-nginx.sh
chmod +x upgrade-nginx.sh

sudo bash upgrade-nginx.sh -n     # 预演：架构、继承的编译参数、模块、加固参数，不改任何东西
sudo bash upgrade-nginx.sh -y     # 真正执行（nginx 已是最新时只更新面板，如果加了 --panel）
```

### 常用参数

| 参数 | 说明 |
|---|---|
| `-n` / `-y` | 预演 / 非交互 |
| `-v 1.31.9` | 指定目标版本（默认 stable 1.30.7） |
| `--install-rust` | 动态模块（如 nginx-acme）需要 Rust 时自动安装 |
| `--panel` | 顺带更新面板（`nginx-mgr` + `tokenctl`） |
| `--panel-release v1.0.4` | 面板指定 Release 版本（显式指定时 Release 优先，镜像只兜底） |
| `--panel-src ./nginx-mgr-linux-arm64` | 离线：用本地文件（也可直接给 URL） |
| `--panel-image <镜像>` | 指定镜像 |
| `--panel-allow-older` | 允许降级（别名 `--panel-force`） |
| `--fix-ssl-zone` | 把各文件里 `ssl_session_cache shared:SSL:<size>` 归一化到主配置尺寸 |

### 面板二进制来源优先级

1. 本地文件（脚本同目录 / `./` / `/root/` 下的 `nginx-mgr-linux-<arch>`）
2. `--panel-release` 显式指定 → GitHub Release
3. 容器镜像（仅当机器有 docker；镜像跟随 main，通常比 tag 对应的 Release 新）
4. GitHub Release（未显式指定版本时的兜底）

安装前用构建戳（`NGXBUILD:<UTC>`）比对，**待装更旧一律拒绝**，避免把旧前端/旧修复无声地装回去。

### 做过的安全检查

- 架构自适应：`x86_64 → amd64`、`aarch64 → arm64`、`armv7l → armv7`；二进制读 ELF 头 `e_machine` 断言，不依赖 `file` 命令
- 继承而非重写编译参数：从 `nginx -V` 取全部参数，只替换优化项，`-L/-I` 原样保留；有动态模块时自动切 `-fPIC` 并去掉 `-pie`
- 先验证后替换：新版先跑 `nginx -t`，通过才换二进制；失败只回滚 `.so`
- 升级后强制 `restart`（reload 不换 master 内存镜像），并用 `/proc/<pid>/exe` 与磁盘 inode 比对确认运行态
- 共享内存区体检：同名 zone（`ssl_session_cache shared:SSL` 等）出现多个尺寸时直接列 `文件:行`，否则任何一次 `nginx -t` 都会失败
- 备份：`/root/nginx_backups/pre-upgrade-<旧>-to-<新>-<时间戳>/`

### 验收（三条缺一不可）

```bash
nginx -t
systemctl is-active nginx nginx-mgr

PID=$(systemctl show -p MainPID --value nginx-mgr)
stat -Lc '%d:%i' /proc/$PID/exe; stat -Lc '%d:%i' /usr/local/bin/nginx-mgr   # inode 必须相同
journalctl -u nginx-mgr -n 50 --no-pager | grep -o 'panel build: NGXBUILD:[0-9TZ]*' | tail -1
```

### 回滚

脚本收尾会打印备份目录与回滚命令，形如：

```bash
cp -a /root/nginx_backups/panel-<时间戳>/nginx-mgr.bin /usr/local/bin/nginx-mgr.new \
  && mv -f /usr/local/bin/nginx-mgr.new /usr/local/bin/nginx-mgr \
  && systemctl restart nginx-mgr
```

> 回滚必须用 `mv`：`cp` 直接覆盖正在执行的二进制会报 `Text file busy`，回滚静默失败。

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
