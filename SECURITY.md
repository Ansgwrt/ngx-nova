# 安全说明

本文件记录 ngx-nova 的安全基线、漏洞修复流程与已知边界。

---

## 1. 本次修复内容

### 1.1 nginx 版本与漏洞

| 项目 | 修复前 | 修复后 |
| --- | --- | --- |
| 版本常量 | `1.28.0`（且未被任何代码使用） | stable `1.30.7` / mainline `1.31.9` |
| 实际安装来源 | 远端脚本 `raw.githubusercontent.com/woniu336/open_shell/main/ngx.sh`（内容不受本仓库控制，且写死 `linux-amd64`） | 本仓库内 `BuildNginxFromSource`，固定版本 + 校验 + 硬化编译 |
| 受影响公告（按 nginx.org 现行公告库比对） | `1.28.0` 命中 32 条，其中 major 4 条 | `1.30.7` 命中 0 条 |

> 旧安装链路的另一个问题：`ngx.sh` 实际是**面板自身**的安装脚本（下载 `nginx-mgr-linux-amd64.tar.gz`），并不会安装 nginx；且硬编码 amd64，arm64 机器上必然失败。这解释了"arm64 装不上"的现象。

### 1.2 校验链

```
nginx.org/download/nginx-<ver>.tar.gz
        │
        ├─ SHA-256 与二进制内嵌值比对（强制，不匹配即删除文件并中止）
        └─ gpg --verify 官方签名（系统有 gpg 时；公钥从 nginx.org/keys 拉取，仅用于校验）
```

内嵌校验值（可用 `gpg` 复核）：

| 版本 | SHA-256 |
| --- | --- |
| 1.30.7 | `2565b5c837050e958f70fb0f73c48e2bca4542ad349fd356f46fb0c72610bc6e` |
| 1.31.9 | `a11c5eeee2e257f4478f0e649f84b0040787d277d2d3e5233952aa6b6dcb80ad` |

两个包均已用 nginx 官方签名密钥（`D6786CE303D9A9022998DC6CC8464D549AF75C0A`，Sergey Kandaurov）验签通过。

### 1.3 编译与运行时加固

- 编译：`-fstack-protector-strong`、`-fstack-clash-protection`、`-D_FORTIFY_SOURCE=3`、`-fPIE -pie`、`-Wl,-z,relro -Wl,-z,now --as-needed`。
- 模块：不编译 `dav` / `mp4` 等存在历史溢出公告且面板不使用的能力，减少攻击面。
- 配置：`server_tokens off`、仅 TLS1.2/1.3、`ssl_session_tickets off`、HSTS、`X-Content-Type-Options`、`X-Frame-Options`、`Referrer-Policy`；限制 `client_header_timeout` / `large_client_header_buffers` 缓解慢速攻击。
- systemd：`NoNewPrivileges=true`、`PrivateTmp=true`、`LimitNOFILE=1048576`。

### 1.4 面板自身

| 风险 | 处理 |
| --- | --- |
| 令牌比较存在时间侧信道 | `subtle.ConstantTimeCompare` |
| 令牌可被在线爆破 | 每 IP 5 次失败 / 10 分钟锁，超限返回 429 + `Retry-After` |
| 弱令牌（如 `1`） | 首次设置要求 ≥ 8 位 |
| 点击劫持 / MIME 嗅探 / Referer 泄露 | CSP(`frame-ancestors 'none'`)、`X-Frame-Options: DENY`、`nosniff`、`no-referrer` |
| 超大请求体打满内存 | 全局 2MB 上限 |
| 版本号注入命令 | 版本参数按 `\d+\.\d+\.\d+` 全串校验后才拼接 |
| 仓库泄漏令牌哈希 | `auth_token.json` 已从版本库移除并加入 `.gitignore` |

---

## 2. 升级流程（生产）

```bash
# 1) 备份（面板内"生成配置备份"或）
tar -czf /root/nginx-$(date +%F).tar.gz -C / etc/nginx

# 2) 面板升级：控制中心 → 版本与安全 → 一键修复升级
#    或 API：
curl -X POST http://127.0.0.1:8083/api/v1/system/upgrade \
  -H "Authorization: Bearer <token>" -H 'Content-Type: application/json' \
  -d '{"version":"1.30.7"}'

# 3) 校验
nginx -v && nginx -t && systemctl is-active nginx
```

升级过程会自动：备份 `/etc/nginx` → 备份旧二进制为 `nginx.prev` → 编译安装 → 还原 `nginx.conf` → `nginx -t` → reload；任一步失败自动回滚二进制。

---

## 3. 已知边界

1. **`auth_token.json` 历史提交**：文件已从当前版本移除，但旧 commit 仍在 Git 历史中。仓库公开的话，历史里的 token 哈希应视为已泄漏（哈希本身不可逆，但建议更换令牌并考虑 `git filter-repo` 清理历史）。
2. **首次登录即设置令牌**：面板在"未设置令牌"状态下允许任何能访问 8083 的人完成初始设置。请先 `ufw`/安全组限制来源，或先在本机完成初始化。
3. **前端资源**：Vue 运行时、Tailwind CSS 均由 `web/build` 构建后打进二进制（`go:embed`），不再依赖公网 CDN 加载脚本；Font Awesome 与 Google Fonts 仍走 CDN（只涉及 style/font，`style-src`/`font-src` 已限定来源）。若需完全离线，把这两个也本地化即可。
4. **CSP 已收紧到 `script-src 'self'`**：脚本全部本地化、无内联、无 `eval`。
   背景：早期版本用 Vue CDN 构建版（运行时编译模板）时，模板编译依赖 `new Function()`，CSP 缺 `'unsafe-eval'` 会导致 `#app` 停在 `v-cloak`、整页空白（线上实际发生过一次）。
   现已改为构建期预编译：

   ```
   web/src/template.html ──@vue/compiler-dom(mode:function)──▶ web/static/app-render.js
   web/src/app.js ──────────────────────────────────────────▶ web/static/app.js  (注入 render)
   Tailwind CLI(content 扫描 src) ───────────────────────────▶ web/static/app.css
   node_modules/vue/dist/vue.runtime.global.prod.js ───────▶ web/static/vendor/
   ```

   构建：`cd web/build && npm ci && npm run build`。产物合计约 385KB（原方案为完整版 Vue + Tailwind JIT 运行时编译，1.1MB+）。
4. **ACME 模块**：站点模板依赖 `acme_certificate` 指令，而它来自第三方模块 [nginx-acme](https://github.com/nginx/nginx-acme)，官方 nginx 源码包**不包含**。
   - v1.0.5 及更早：安装流程传 `--with-http_acme_module`（nginx 并无此 configure 选项）→ configure 失败 → 退回标准模块集，模块永远缺失，`acme=false`。
   - v1.0.6 起：nginx 装好后单独把 nginx-acme 编成动态模块（`cargo build --release`，依赖 Rust ≥ 1.85 / clang / libclang），装到 `<prefix>/modules/ngx_http_acme_module.so`，主配置幂等补 `load_module` + `resolver` + `acme_shared_zone`，并写 `conf.d/00-acme-issuer.conf`。任何一步失败都只降级为固定证书路径，不影响 nginx 可用；面板靠"模块文件存在或主配置里 load_module"判断 `acme=true`。
   - 探测顺序：`nginx -V` 含 `http_acme_module` → 主配置非注释 `load_module` 含 acme（动态模块不会出现在 `-V` 里）。
   - 没有模块时渲染自管证书路径 `<conf>/ssl/<domain>.crt|.key`，缺失时面板自动补自签占位证书。
   同理 `brotli` 指令也按模块存在与否决定是否渲染。

5. **升级会覆盖第三方模块**：如果现有 nginx 编译过 `--add-module`（例如 acme / brotli / 自定义过滤器），官方源码构建不会包含它们。升级接口会先返回 409 并说明原因，必须显式带 `force=true` 才继续——这能避免"升级完站点全挂"。

---

## 4. 凭据管理

- 本仓库**不保存**任何账号口令。CI 推送镜像使用 GitHub Secrets：`DOCKERHUB_USERNAME`、`DOCKERHUB_TOKEN`。
- `DOCKERHUB_TOKEN` 应为 Docker Hub 的 **Access Token**（Read & Write），不要使用账号密码。
- 若口令曾以明文形式出现在聊天、工单或提交中，请立即改密并开启两步验证；GitHub 建议改用 Personal Access Token（细粒度，仅仓库权限）。
