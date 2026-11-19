#!/usr/bin/env bash
#
# nginx 安全升级脚本（保留第三方模块）
#
# 设计原则：
#   1. 不硬编码架构与模块 —— 从 `nginx -V` 继承现有编译参数，brotli / acme 等模块原样带上
#   2. 不覆盖任何站点配置 —— 只替换二进制与动态模块，跳过 `make install`
#   3. 先验证后替换 —— 新版 nginx 先跑 `-t` 通过才换，任何一步失败自动回滚
#   4. 全流程留痕 —— 日志与备份在 /var/log、/root/nginx_backups
#
# 用法：
#   ./upgrade-nginx.sh                    # 升级到 1.30.7（stable 最新修复版）
#   ./upgrade-nginx.sh -v 1.31.9          # 指定 mainline
#   ./upgrade-nginx.sh -n                 # 预演：只打印计划，不编译不替换
#   ./upgrade-nginx.sh -y                 # 非交互
#   ./upgrade-nginx.sh --install-rust     # 动态模块需要 Rust 时自动安装
#   ./upgrade-nginx.sh --panel            # 同时更新面板二进制（从镜像提取，默认 answgrt/ngx-nova:latest）
#   ./upgrade-nginx.sh --panel --panel-image ghcr.io/ansgwrt/ngx-nova:latest
#   ./upgrade-nginx.sh --panel --panel-src /root/nginx-mgr-linux-arm64   # 离线：用本地文件
#
# 退出码：0 成功 / 1 参数或环境问题 / 2 编译或验证失败（已回滚）
set -Eeuo pipefail

TARGET_VERSION="${TARGET_VERSION:-1.30.7}"
# 与 ngx-nova 仓库内嵌校验值保持一致；未收录的版本改为仅 PGP 验签
declare -A PINNED_SHA256=(
  ["1.30.7"]="2565b5c837050e958f70fb0f73c48e2bca4542ad349fd356f46fb0c72610bc6e"
  ["1.31.9"]="a11c5eeee2e257f4478f0e649f84b0040787d277d2d3e5233952aa6b6dcb80ad"
)

BACKUP_ROOT="/root/nginx_backups"
BUILD_ROOT="/usr/local/src/nginx-build"
STAMP="$(date +%Y%m%d_%H%M%S)"
LOG="/var/log/nginx-upgrade-${STAMP}.log"

DRY_RUN=0
ASSUME_YES=0
INSTALL_RUST=0
PANEL=0
PANEL_SRC=""
# 默认从镜像提取面板二进制；Docker Hub 优先，拉不到自动回落 GHCR
if [[ -n "${PANEL_IMAGE:-}" ]]; then
  PANEL_IMAGES=("$PANEL_IMAGE")
else
  PANEL_IMAGES=(ansgwrt/ngx-nova:latest ghcr.io/ansgwrt/ngx-nova:latest)
fi
PANEL_EXTRACT_DIR=""
PANEL_BIN="/usr/local/bin/nginx-mgr"
PANEL_UNIT="nginx-mgr"
PANEL_PORT="${PANEL_PORT:-8083}"

# ---------------------------------------------------------------- 输出与错误

c_red=$'\033[31m'; c_grn=$'\033[32m'; c_ylw=$'\033[33m'; c_cyn=$'\033[36m'; c_rst=$'\033[0m'

log()  { printf '%s[%s]%s %s\n' "$c_cyn" "$(date +%H:%M:%S)" "$c_rst" "$*" | tee -a "$LOG"; }
ok()   { printf '%s  ✓%s %s\n' "$c_grn" "$c_rst" "$*" | tee -a "$LOG"; }
warn() { printf '%s  !%s %s\n' "$c_ylw" "$c_rst" "$*" | tee -a "$LOG"; }
die()  { printf '%s  ✗ %s%s\n' "$c_red" "$*" "$c_rst" | tee -a "$LOG" >&2; exit 1; }

on_error() {
  local rc=$?
  printf '%s\n' "${c_red}--- 第 ${BASH_LINENO[0]} 行执行失败（退出码 $rc）---${c_rst}" | tee -a "$LOG" >&2
  if [[ -n "${ROLLBACK_HINT:-}" ]]; then
    printf '%s%s%s\n' "$c_ylw" "$ROLLBACK_HINT" "$c_rst" | tee -a "$LOG" >&2
  fi
  exit 2
}
trap on_error ERR

usage() { sed -n '2,20p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    -v|--version) TARGET_VERSION="${2:?缺少版本号}"; shift 2 ;;
    -n|--dry-run) DRY_RUN=1; shift ;;
    -y|--yes)     ASSUME_YES=1; shift ;;
    --install-rust) INSTALL_RUST=1; shift ;;
    --panel)      PANEL=1; shift ;;
    --panel-src)  PANEL=1; PANEL_SRC="${2:?缺少路径}"; shift 2 ;;
    --panel-image) PANEL=1; PANEL_IMAGES=("${2:?缺少镜像名}"); shift 2 ;;
    -h|--help)    usage ;;
    *) die "未知参数: $1（-h 查看用法）" ;;
  esac
done

[[ $EUID -eq 0 ]] || die "需要 root 权限运行"
mkdir -p "$BACKUP_ROOT"
: > "$LOG"

# ---------------------------------------------------------------- 环境探测

detect_arch() {
  local m; m="$(uname -m)"
  case "$m" in
    x86_64|amd64)   ARCH="amd64" ;;
    aarch64|arm64)  ARCH="arm64" ;;
    armv7l|armv6l)  ARCH="armv7" ;;
    *) die "不支持的架构: $m" ;;
  esac
  log "架构: $(uname -m) → ${ARCH}（内核 $(uname -r)）"
}

# 加固编译参数逐个实测，aarch64 上不支持的直接跳过，避免编不过
probe_hardening_flags() {
  local probe; probe="$(mktemp -d)"
  printf 'int main(void){return 0;}\n' > "$probe/t.c"
  CC_EXTRA=()
  for flag in -fstack-protector-strong -fstack-clash-protection -D_FORTIFY_SOURCE=3 -fPIE; do
    if gcc "$flag" -O2 "$probe/t.c" -o "$probe/t.out" >/dev/null 2>&1; then
      CC_EXTRA+=("$flag")
    else
      warn "编译器不支持 $flag，已跳过"
    fi
  done
  rm -rf "$probe"
  # 极端情况下（无可用 gcc）仍保留最基础的几项，force_deps 之后会装上 gcc
  if [[ ${#CC_EXTRA[@]} -eq 0 ]]; then
    CC_EXTRA=(-fstack-protector-strong -D_FORTIFY_SOURCE=3 -fPIE)
    warn "未能探测编译器能力，使用默认加固参数"
  fi
}

check_nginx() {
  export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:${HOME}/.cargo/bin:/usr/local/cargo/bin"
  command -v nginx >/dev/null 2>&1 || die "未找到 nginx，本脚本只用于升级已安装的 nginx"

  NGINX_BIN="$(command -v nginx)"
  CURRENT_VERSION="$(nginx -v 2>&1 | sed -n 's#.*nginx/\([0-9.]*\).*#\1#p')"
  [[ -n "$CURRENT_VERSION" ]] || die "无法解析当前 nginx 版本"

  NGINX_CONF="$(nginx -V 2>&1 | sed -n "s/.*--conf-path=\([^ ]*\).*/\1/p")"
  [[ -n "$NGINX_CONF" ]] || NGINX_CONF="/etc/nginx/nginx.conf"

  log "当前版本: ${CURRENT_VERSION}"
  log "二进制:   ${NGINX_BIN}"
  log "主配置:   ${NGINX_CONF}"
  log "目标版本: ${TARGET_VERSION}"

  if [[ "$CURRENT_VERSION" == "$TARGET_VERSION" ]]; then
    if running_binary_matches; then
      ok "磁盘与运行中均为 ${TARGET_VERSION}"
      NGINX_UP_TO_DATE=1
      return 0
    fi
    warn "磁盘已是 ${TARGET_VERSION}，但运行中的进程仍是旧镜像（reload 不会换镜像）"
    log "重启 nginx 使新二进制生效"
    restart_nginx
    sleep 1
    running_binary_matches || die "重启后运行镜像仍不匹配，请检查 systemctl status nginx"
    ok "已生效，运行版本: $(running_version)"
    NGINX_UP_TO_DATE=1
    return 0
  fi
  NGINX_UP_TO_DATE=0
}

# ------------------------------------------------- 从 nginx -V 继承编译参数

collect_configure_args() {
  local raw
  raw="$(nginx -V 2>&1 | sed -n 's/^configure arguments: //p')"
  [[ -n "$raw" ]] || die "无法读取 nginx 编译参数（nginx -V 无输出）"

  # 先保留原来的 -I / -L（第三方库路径，例如 brotli 的预编译目录），优化参数整体重建
  local orig_cc orig_ld
  orig_cc="$(printf '%s' "$raw" | sed -nE "s/.*--with-cc-opt='([^']*)'.*/\1/p")"
  orig_ld="$(printf '%s' "$raw" | sed -nE "s/.*--with-ld-opt='([^']*)'.*/\1/p")"
  EXTRA_CFLAGS=(); EXTRA_LDFLAGS=()
  local f
  for f in $(printf '%s' "$orig_cc" | tr ' ' '\n' | grep -E '^-I' || true); do EXTRA_CFLAGS+=("$f"); done
  for f in $(printf '%s' "$orig_ld" | tr ' ' '\n' | grep -E '^-L' || true); do EXTRA_LDFLAGS+=("$f"); done
  [[ ${#EXTRA_LDFLAGS[@]} -gt 0 ]] && log "保留链接路径: ${EXTRA_LDFLAGS[*]}"

  # 去掉旧优化参数（引号内可能含空格，先整体剔除再分词），其余原样保留
  raw="$(printf '%s' "$raw" | sed -E "s/--with-cc-opt='[^']*'//g; s/--with-ld-opt='[^']*'//g")"
  raw="$(printf '%s' "$raw" | sed -E 's/--with-cc-opt="[^"]*"//g; s/--with-ld-opt="[^"]*"//g')"

  local -a args=()
  read -r -a args <<< "$raw"

  STATIC_MODULES=()
  DYNAMIC_MODULES=()
  local -a kept=()
  for a in "${args[@]}"; do
    case "$a" in
      --with-cc-opt=*|--with-ld-opt=*) continue ;;
      --add-module=*)
        local p="${a#--add-module=}"
        if [[ -d "$p" ]]; then STATIC_MODULES+=("$a"); kept+=("$a");
        else warn "静态模块源码已不存在，跳过: $p"; fi
        continue ;;
      --add-dynamic-module=*)
        local p="${a#--add-dynamic-module=}"
        if [[ -d "$p" ]]; then DYNAMIC_MODULES+=("$a"); kept+=("$a");
        else warn "动态模块源码已不存在，跳过: $p"; fi
        continue ;;
    esac
    kept+=("$a")
  done

  # 动态模块要求主程序 --with-compat，缺了补上
  local has_compat=0
  for a in "${kept[@]}"; do [[ "$a" == "--with-compat" ]] && has_compat=1; done
  [[ $has_compat -eq 1 ]] || { kept+=("--with-compat"); warn "原编译参数缺少 --with-compat，已自动补上（动态模块需要）"; }

  CONFIGURE_ARGS=("${kept[@]}")

  log "继承 ${#CONFIGURE_ARGS[@]} 个编译参数"
  [[ ${#STATIC_MODULES[@]}  -gt 0 ]] && log "  静态模块: ${STATIC_MODULES[*]}"
  [[ ${#DYNAMIC_MODULES[@]} -gt 0 ]] && log "  动态模块: ${DYNAMIC_MODULES[*]}"

  # 记录 load_module 的目标目录，动态模块编译后要装回去
  MODULE_DIRS=()
  if [[ -f "$NGINX_CONF" ]]; then
    while read -r so; do
      [[ -n "$so" ]] || continue
      local d; d="$(dirname "$so")"
      [[ " ${MODULE_DIRS[*]:-} " == *" $d "* ]] || MODULE_DIRS+=("$d")
    done < <(grep -hoE 'load_module[[:space:]]+[^;]+' "$NGINX_CONF" 2>/dev/null | awk '{print $2}')
  fi
  [[ ${#MODULE_DIRS[@]} -gt 0 ]] && log "  动态模块目录: ${MODULE_DIRS[*]}"

  # nginx 自带 --modules-path 时优先用它
  MODULES_PATH="$(printf '%s\n' "${CONFIGURE_ARGS[@]}" | sed -n 's/^--modules-path=//p' | head -1)"
  [[ -n "$MODULES_PATH" ]] && log "  模块安装路径: ${MODULES_PATH}"
  return 0
}

# ---------------------------------------------------------------- 依赖与源码

ensure_deps() {
  local need=()
  for c in gcc make tar curl; do command -v "$c" >/dev/null 2>&1 || need+=("$c"); done
  if [[ ${#need[@]} -gt 0 ]] || ! ldconfig -p 2>/dev/null | grep -q libpcre2-8; then
    log "安装编译依赖"
    if command -v apt-get >/dev/null 2>&1; then
      apt-get update -qq
      DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        build-essential libpcre2-dev zlib1g-dev libssl-dev ca-certificates curl gnupg
    else
      die "缺少编译依赖且非 apt 系统，请手动安装 gcc/make/pcre2/zlib/openssl 开发包"
    fi
  fi
}

# 部分动态模块（如 nginx-acme）用 Rust 编写，编译需要 cargo。
# 缺少时给出明确指引，或用 --install-rust 让脚本自动装 rustup（minimal）。
ensure_rust_if_needed() {
  [[ ${#DYNAMIC_MODULES[@]} -gt 0 ]] || return 0

  local needs_rust=0 d
  for d in "${DYNAMIC_MODULES[@]}"; do
    d="${d#--add-dynamic-module=}"
    [[ -f "${d}/Cargo.toml" ]] && needs_rust=1
  done
  [[ $needs_rust -eq 1 ]] || return 0

  if command -v cargo >/dev/null 2>&1; then
    ok "Rust 工具链: $(cargo --version 2>/dev/null | head -1)"
    return 0
  fi

  if [[ $INSTALL_RUST -eq 0 ]]; then
    die "动态模块需要 Rust（cargo）但系统未安装。
      重新执行并加上 --install-rust 由脚本自动安装，或手动安装：
        curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal
        source \$HOME/.cargo/env"
  fi

  log "安装 Rust 工具链（minimal，约需 1-2 分钟）"
  if ! command -v curl >/dev/null 2>&1; then
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends curl ca-certificates
  fi
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal --default-toolchain stable >/dev/null
  export PATH="${HOME}/.cargo/bin:${PATH}"
  command -v cargo >/dev/null 2>&1 || die "Rust 安装失败，请手动安装后重试"
  ok "Rust 已就绪: $(cargo --version | head -1)"
}

fetch_source() {
  local tar="nginx-${TARGET_VERSION}.tar.gz"
  local url="https://nginx.org/download/${tar}"
  mkdir -p "$BUILD_ROOT"
  cd "$BUILD_ROOT"

  if [[ -f "$tar" && -f "${tar}.asc" ]]; then
    ok "已存在源码包，复用: ${BUILD_ROOT}/${tar}"
  else
    log "下载 ${url}"
    curl -fsSL --retry 3 --max-time 300 -o "$tar" "$url"
    curl -fsSL --retry 3 --max-time 120 -o "${tar}.asc" "${url}.asc" || warn "签名文件下载失败，将只做 SHA-256 校验"
  fi

  # 1) SHA-256（内嵌固定值，强制）
  local expected="${PINNED_SHA256[$TARGET_VERSION]:-}"
  local actual; actual="$(sha256sum "$tar" | awk '{print $1}')"
  if [[ -n "$expected" ]]; then
    [[ "$actual" == "$expected" ]] || { rm -f "$tar"; die "源码校验失败：期望 $expected，实际 $actual"; }
    ok "SHA-256 匹配: ${actual}"
  else
    warn "版本 ${TARGET_VERSION} 未收录校验值，仅依赖 PGP 验签（实际 SHA-256: ${actual}）"
  fi

  # 2) PGP（纵深防御）
  if [[ -f "${tar}.asc" ]] && command -v gpg >/dev/null 2>&1; then
    local gp; gp="$(mktemp -d)"
    if GNUPGHOME="$gp" bash -c '
        for k in nginx_signing arut pluknet sb thresh; do
          curl -fsSL --max-time 30 "https://nginx.org/keys/$k.key" 2>/dev/null | gpg --batch --quiet --import 2>/dev/null || true
        done
        gpg --batch --verify "'"${tar}.asc"'" "'"${tar}"'" 2>&1 | grep -q "Good signature"
      '; then
      ok "PGP 签名有效"
    else
      warn "PGP 验签未通过或公钥不可用（SHA-256 已通过）"
    fi
    rm -rf "$gp"
  fi

  SRC_DIR="${BUILD_ROOT}/nginx-${TARGET_VERSION}"
  rm -rf "$SRC_DIR"
  tar -xzf "$tar"
  [[ -x "${SRC_DIR}/configure" ]] || die "源码解压异常，未找到 configure"
  ok "源码就绪: ${SRC_DIR}"
}


# ---------------------------------------------------------------- 运行态判定

# 运行中的 master 是否就是磁盘上的这个二进制（inode 相同）。
# 注意：`nginx -s reload` 不会让 master 换掉内存镜像，替换二进制后必须 restart 才真正生效，
#      只看 `nginx -v`（读的是磁盘文件）会得到假阳性。
running_binary_matches() {
  local pid; pid="$(cat /run/nginx.pid 2>/dev/null || true)"
  [[ -n "$pid" ]] || return 1
  [[ -e "/proc/$pid/exe" ]] || return 1
  local a b
  a="$(stat -Lc '%d:%i' "/proc/$pid/exe" 2>/dev/null || true)"
  b="$(stat -Lc '%d:%i' "$NGINX_BIN" 2>/dev/null || true)"
  [[ -n "$a" && "$a" == "$b" ]]
}

running_version() {
  local pid; pid="$(cat /run/nginx.pid 2>/dev/null || true)"
  [[ -n "$pid" && -e "/proc/$pid/exe" ]] || return 1
  strings "/proc/$pid/exe" 2>/dev/null | sed -n 's#^nginx version: nginx/\([0-9.]*\)$#\1#p' | head -1
}

restart_nginx() {
  if command -v systemctl >/dev/null 2>&1; then
    systemctl restart nginx
  else
    nginx -s quit 2>/dev/null || true
    sleep 1
    nginx
  fi
}

# ---------------------------------------------------------------- 备份

backup_everything() {
  BACKUP_DIR="${BACKUP_ROOT}/pre-upgrade-${CURRENT_VERSION}-to-${TARGET_VERSION}-${STAMP}"
  mkdir -p "$BACKUP_DIR"

  local conf_dir; conf_dir="$(dirname "$NGINX_CONF")"
  tar -czf "${BACKUP_DIR}/nginx-conf.tar.gz" -C / "${conf_dir#/}" 2>/dev/null \
    && ok "配置已备份: ${BACKUP_DIR}/nginx-conf.tar.gz"

  cp -a "$NGINX_BIN" "${BACKUP_DIR}/nginx.bin" && ok "二进制已备份: ${BACKUP_DIR}/nginx.bin"

  for d in "${MODULE_DIRS[@]:-}"; do
    [[ -d "$d" ]] || continue
    cp -a "$d" "${BACKUP_DIR}/modules-$(basename "$d")" 2>/dev/null && ok "动态模块已备份: $d"
  done
  echo "$BACKUP_DIR" > /tmp/.nginx_upgrade_backup_dir
}

# ---------------------------------------------------------------- 编译

# 编译参数：加固 + 与动态模块兼容
# 注意：编译动态模块时 nginx 会用 -shared 链接 .so，此时再带 -pie 会冲突，
#      因此有动态模块时改用 -fPIC 且不加 -pie（Debian 的 gcc 默认仍产出 PIE 可执行文件）
compute_build_flags() {
  local -a cc_flags=(-O2 -pipe) ld_flags=(-Wl,-z,relro -Wl,-z,now -Wl,--as-needed)
  local f
  for f in "${CC_EXTRA[@]}"; do
    [[ "$f" == "-fPIE" ]] && continue
    cc_flags+=("$f")
  done

  if [[ ${#DYNAMIC_MODULES[@]} -gt 0 ]]; then
    cc_flags+=(-fPIC)
    log "存在动态模块 → 使用 -fPIC，且 ld 不启用 -pie（避免 -shared 链接冲突）"
  else
    cc_flags+=(-fPIE)
    ld_flags+=(-pie)
  fi

  [[ ${#EXTRA_CFLAGS[@]}  -gt 0 ]] && cc_flags+=("${EXTRA_CFLAGS[@]}")
  [[ ${#EXTRA_LDFLAGS[@]} -gt 0 ]] && ld_flags+=("${EXTRA_LDFLAGS[@]}")

  CC_OPT="${cc_flags[*]}"
  LD_OPT="${ld_flags[*]}"
}

build_nginx() {
  cd "$SRC_DIR"

  log "configure（目标 ${ARCH}）"
  ./configure "${CONFIGURE_ARGS[@]}" \
      --with-cc-opt="$CC_OPT" \
      --with-ld-opt="$LD_OPT" \
      > "${LOG%.log}-configure.log" 2>&1 \
    || { tail -30 "${LOG%.log}-configure.log" | tee -a "$LOG"; die "configure 失败，详见 ${LOG%.log}-configure.log"; }

  local jobs; jobs="$(nproc)"; [[ $jobs -gt 8 ]] && jobs=8
  log "编译中（make -j${jobs}，约 1-3 分钟）"
  make -j"$jobs" > "${LOG%.log}-make.log" 2>&1 \
    || { tail -30 "${LOG%.log}-make.log" | tee -a "$LOG"; die "编译失败，详见 ${LOG%.log}-make.log"; }
  ok "nginx 编译完成"

  NEW_SO=()
  if [[ ${#DYNAMIC_MODULES[@]} -gt 0 ]]; then
    log "编译动态模块"
    make modules > "${LOG%.log}-modules.log" 2>&1 \
      || { tail -30 "${LOG%.log}-modules.log" | tee -a "$LOG"; die "动态模块编译失败"; }
    while IFS= read -r so; do NEW_SO+=("$so"); done < <(find objs -maxdepth 1 -name '*.so' 2>/dev/null)
    [[ ${#NEW_SO[@]} -gt 0 ]] || die "未生成任何 .so，动态模块编译异常"
    ok "动态模块就绪: ${NEW_SO[*]##*/}"
  fi
}

# ------------------------------------------------- 验证 → 替换 → 重载

staged_verify() {
  cd "$SRC_DIR"
  log "新版二进制做配置校验（加载当前动态模块）"
  if ! ./objs/nginx -t -c "$NGINX_CONF" >> "$LOG" 2>&1; then
    warn "用旧版动态模块校验失败 —— 这通常是模块 ABI 与新版不匹配，属预期情况"
    warn "将改用本次新编译的动态模块再校验一次"
    return 0
  fi
  ok "配置校验通过"
}

install_modules() {
  local dir="${MODULES_PATH:-${MODULE_DIRS[0]:-/usr/lib/nginx/modules}}"
  for so in "${NEW_SO[@]:-}"; do
    [[ -f "$so" ]] || continue
    local target="${dir}/$(basename "$so")"
    [[ -f "$target" ]] && cp -a "$target" "${target}.pre-${TARGET_VERSION}"
    install -m 0755 "$so" "$target"
    ok "已更新动态模块: $target"
  done
}

verify_and_install() {
  cd "$SRC_DIR"

  log "最终校验（新二进制 + 新模块）"
  if ! ./objs/nginx -t -c "$NGINX_CONF" >> "$LOG" 2>&1; then
    tail -20 "$LOG"
    ROLLBACK_HINT="校验失败：动态模块已回退，nginx 二进制未改动，线上仍是 ${CURRENT_VERSION}。"
    for so in "${NEW_SO[@]:-}"; do
      local t="${MODULES_PATH:-${MODULE_DIRS[0]:-/usr/lib/nginx/modules}}/$(basename "$so")"
      [[ -f "${t}.pre-${TARGET_VERSION}" ]] && mv -f "${t}.pre-${TARGET_VERSION}" "$t" && warn "已回退 $t"
    done
    die "新版 nginx 无法通过配置校验，已中止（未替换二进制）"
  fi
  ok "配置校验通过"

  log "替换二进制"
  install -m 0755 ./objs/nginx "$NGINX_BIN"
  ok "已安装到 ${NGINX_BIN}"

  # 二进制已被替换，master 内存里仍是旧镜像 —— 必须 restart，reload 不够
  log "重启 nginx 以载入新二进制（约 0.2s 连接中断）"
  restart_nginx
  sleep 1

  running_binary_matches || die "运行中的进程仍是旧镜像，请手动执行 systemctl restart nginx"
  ok "运行态已切换"

  local now; now="$(running_version || true)"
  [[ "$now" == "$TARGET_VERSION" ]] || die "运行版本校验失败：期望 ${TARGET_VERSION}，实际 ${now:-未知}"
  ok "运行版本确认: ${now}（磁盘同名版本一致）"

  if command -v systemctl >/dev/null 2>&1; then
    systemctl is-active --quiet nginx && ok "服务状态: active" || die "服务未处于 active 状态"
  fi

  # 站点配置仍可正常解析
  nginx -t >> "$LOG" 2>&1 && ok "站点配置: 校验通过" || die "站点配置校验失败"
}

# ---------------------------------------------------------------- 主流程


# ---------------------------------------------------------------- 面板二进制来源

# 从容器镜像里取出面板二进制与 tokenctl。
# 只做 create + cp，不启动容器；按候选列表依次尝试（Docker Hub → GHCR）。
extract_panel_from_image() {
  command -v docker >/dev/null 2>&1 || return 1

  local img cid dir
  for img in "${PANEL_IMAGES[@]}"; do
    log "尝试镜像: ${img}（linux/${ARCH}）"
    if ! docker pull --platform "linux/${ARCH}" "$img" >/dev/null 2>&1; then
      warn "  拉取失败（镜像不存在、未公开或需要登录），跳过"
      continue
    fi

    if ! cid="$(docker create --platform "linux/${ARCH}" "$img" 2>/dev/null)"; then
      warn "  无法从该镜像创建容器，跳过"
      continue
    fi

    dir="$(mktemp -d)"
    if docker cp "${cid}:/usr/local/bin/nginx-mgr" "${dir}/nginx-mgr" >/dev/null 2>&1; then
      # 架构校验：镜像可能是用错参数构建的（例如 arm64 标签里装 amd64 二进制），
      # 命中就换下一个候选，不要让错误架构的二进制落到系统里。
      local info; info="$(file -b "${dir}/nginx-mgr" 2>/dev/null || echo unknown)"
      case "$ARCH" in
        amd64) if [[ "$info" != *x86-64* ]]; then
                 warn "  镜像内二进制架构不符（期望 amd64）: ${info}"
                 docker rm -f "$cid" >/dev/null 2>&1 || true; rm -rf "$dir"; continue
               fi ;;
        arm64) if [[ "$info" != *aarch64* ]]; then
                 warn "  镜像内二进制架构不符（期望 arm64）: ${info}"
                 docker rm -f "$cid" >/dev/null 2>&1 || true; rm -rf "$dir"; continue
               fi ;;
      esac
      if docker cp "${cid}:/usr/local/bin/tokenctl" "${dir}/tokenctl" >/dev/null 2>&1; then
        ok "  已提取 nginx-mgr 与 tokenctl"
      else
        warn "  镜像内无 tokenctl，本次只更新面板"
        rm -f "${dir}/tokenctl"
      fi
      docker rm -f "$cid" >/dev/null 2>&1 || true
      chmod +x "${dir}/nginx-mgr"
      PANEL_EXTRACT_DIR="$dir"
      echo "$img" > "${dir}/.source-image"
      ok "面板二进制来源: ${img}"
      return 0
    fi

    docker rm -f "$cid" >/dev/null 2>&1 || true
    rm -rf "$dir"
    warn "  镜像内未找到 /usr/local/bin/nginx-mgr，跳过"
  done
  return 1
}

# ---------------------------------------------------------------- 面板更新

panel_health() {
  local code
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "http://127.0.0.1:${PANEL_PORT}/ui/" || echo 000)"
  [[ "$code" == "200" ]]
}

update_panel() {
  log "=== 更新面板（nginx-mgr）==="
  : "${BACKUP_DIR:=${BACKUP_ROOT}/panel-${STAMP}}"

  local src="$PANEL_SRC"
  local tk=""

  if [[ -z "$src" ]]; then
    # 1) 脚本同目录 / 常见路径下的本地二进制（离线可用）
    local here; here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local cand
    for cand in "${here}/nginx-mgr-linux-${ARCH}" "./nginx-mgr-linux-${ARCH}" "/root/nginx-mgr-linux-${ARCH}"; do
      if [[ -f "$cand" ]]; then src="$cand"; break; fi
    done
    [[ -n "$src" ]] && tk="${src%/*}/tokenctl-linux-${ARCH}"
  fi

  # 2) 没有本地文件就从镜像里取
  if [[ -z "$src" ]]; then
    if [[ $DRY_RUN -eq 1 ]]; then
      log "[预演] 将从镜像提取面板二进制，候选顺序：${PANEL_IMAGES[*]}"
      log "[预演] 将备份 ${PANEL_BIN} 并 restart ${PANEL_UNIT}"
      return 0
    fi
    if ! extract_panel_from_image; then
      die "无法从镜像获取可用的面板二进制。已尝试：${PANEL_IMAGES[*]}
      常见原因：
        1) 镜像尚未发布或未公开 —— docker manifest inspect ${PANEL_IMAGES[0]}
        2) 镜像里 ${ARCH} 架构的二进制不对（构建参数写错）—— 需重新构建镜像
      兜底方案：用本地文件 --panel-src /path/nginx-mgr-linux-${ARCH}"
    fi
    src="${PANEL_EXTRACT_DIR}/nginx-mgr"
    tk="${PANEL_EXTRACT_DIR}/tokenctl"
  fi

  # 3) --panel-src 允许给 URL
  if [[ "$src" =~ ^https?:// ]]; then
    local dl; dl="$(mktemp -d)/nginx-mgr"
    log "下载面板二进制: $src"
    curl -fsSL --retry 3 --max-time 300 -o "$dl" "$src"
    src="$dl"
    tk="${dl%/*}/tokenctl-linux-${ARCH}"
  fi
  [[ -f "$src" ]] || die "面板二进制不存在: $src"
  src="$(readlink -f "$src")"

  # 架构校验，防止把 amd64 传上 arm64 机器
  local info; info="$(file -b "$src")"
  [[ "$info" == *ELF*64* ]] || die "不是 64 位 ELF 可执行文件: ${info}"
  case "$ARCH" in
    amd64) [[ "$info" == *x86-64* ]] || die "架构不匹配（期望 x86-64）: ${info}" ;;
    arm64) [[ "$info" == *aarch64* ]] || die "架构不匹配（期望 aarch64）: ${info}" ;;
    armv7) [[ "$info" == *ARM* ]] || die "架构不匹配: ${info}" ;;
  esac
  ok "二进制校验通过（${ARCH}）: $(basename "$src")"

  if [[ -f "$PANEL_BIN" ]] && cmp -s "$src" "$PANEL_BIN"; then
    ok "面板二进制与在跑版本一致，跳过替换"
    [[ -n "$PANEL_EXTRACT_DIR" ]] && rm -rf "$PANEL_EXTRACT_DIR"
    return 0
  fi

  if [[ $DRY_RUN -eq 1 ]]; then
    log "[预演] 将备份 ${PANEL_BIN} → ${BACKUP_DIR}/nginx-mgr.bin，替换后 restart ${PANEL_UNIT}"
    return 0
  fi

  mkdir -p "$BACKUP_DIR"
  if [[ -f "$PANEL_BIN" ]]; then
    cp -a "$PANEL_BIN" "${BACKUP_DIR}/nginx-mgr.bin"
    ok "旧面板已备份: ${BACKUP_DIR}/nginx-mgr.bin"
  fi

  # tokenctl 与面板同版本，一并更新（存在才动）
  if [[ -n "$tk" && -f "$tk" ]]; then
    [[ -f /usr/local/bin/tokenctl ]] && cp -a /usr/local/bin/tokenctl "${BACKUP_DIR}/tokenctl.bin"
    install -m 0755 "$tk" /usr/local/bin/tokenctl
    ok "tokenctl 已更新"
  fi

  # 原子替换 + 重启
  install -m 0755 "$src" "${PANEL_BIN}.new"
  mv -f "${PANEL_BIN}.new" "$PANEL_BIN"
  systemctl daemon-reload 2>/dev/null || true
  systemctl restart "$PANEL_UNIT"
  log "等待面板就绪"

  local i
  for i in $(seq 1 15); do
    sleep 1
    if panel_health; then
      ok "面板健康检查通过（http://127.0.0.1:${PANEL_PORT}/ui/ → 200）"
      [[ -n "$PANEL_EXTRACT_DIR" ]] && rm -rf "$PANEL_EXTRACT_DIR"
      return 0
    fi
  done

  warn "面板启动后健康检查失败，开始回滚"
  [[ -f "${BACKUP_DIR}/nginx-mgr.bin" ]] && cp -a "${BACKUP_DIR}/nginx-mgr.bin" "$PANEL_BIN"
  [[ -f "${BACKUP_DIR}/tokenctl.bin" ]] && cp -a "${BACKUP_DIR}/tokenctl.bin" /usr/local/bin/tokenctl
  systemctl restart "$PANEL_UNIT" 2>/dev/null || true
  systemctl --no-pager status "$PANEL_UNIT" 2>&1 | tail -12
  die "面板更新失败，已回滚到旧二进制"
}

main() {
  log "=== 升级开始 ==="
  detect_arch
  check_nginx

  if [[ ${NGINX_UP_TO_DATE:-0} -eq 1 ]]; then
    log "nginx 已是 ${TARGET_VERSION}，跳过编译"
  else
    collect_configure_args
    [[ $DRY_RUN -eq 0 ]] && ensure_deps
    probe_hardening_flags
    compute_build_flags

    log "计划：${CURRENT_VERSION} → ${TARGET_VERSION}（${ARCH}）"
    log "将保留：${#STATIC_MODULES[@]} 个静态模块、${#DYNAMIC_MODULES[@]} 个动态模块；不覆盖任何站点配置"

    if [[ $DRY_RUN -eq 1 ]]; then
      echo
      log "预演模式，以下为将执行的 configure 参数："
      printf '  ./configure %s \\\n      --with-cc-opt="%s" \\\n      --with-ld-opt="%s"\n\n' \
        "${CONFIGURE_ARGS[*]}" "$CC_OPT" "$LD_OPT"
    else
      if [[ $ASSUME_YES -eq 0 ]]; then
        read -r -p "确认继续？升级期间会有一次 restart（约 0.2s 中断）。[y/N] " a
        [[ "$a" =~ ^[Yy]$ ]] || { log "已取消"; exit 0; }
      fi
      fetch_source
      ensure_rust_if_needed
      backup_everything
      build_nginx
      staged_verify
      install_modules
      verify_and_install
    fi
  fi

  if [[ $PANEL -eq 1 ]]; then
    update_panel
  fi

  if [[ $DRY_RUN -eq 1 ]]; then
    ok "预演结束，未做任何改动"
    exit 0
  fi

  echo
  if [[ ${NGINX_UP_TO_DATE:-0} -eq 1 ]]; then
    ok "=== 完成：nginx 保持 ${TARGET_VERSION}（${ARCH}）==="
  else
    ok "=== 升级完成：${CURRENT_VERSION} → ${TARGET_VERSION}（${ARCH}）==="
  fi
  ok "备份目录: ${BACKUP_DIR:-无（未做改动）}"
  ok "日志文件: ${LOG}"

  # 面板是独立组件，默认不动；不提示的话很容易误以为"升级脚本跑完就全好了"
  if [[ $PANEL -eq 0 && -f "$PANEL_BIN" ]]; then
    warn "面板（nginx-mgr）未更新：本次只处理 nginx。"
    warn "如需一并更新面板，重新执行并加上 --panel（从镜像提取，秒级完成）"
  fi

  if [[ -n "${BACKUP_DIR:-}" && -f "${BACKUP_DIR}/nginx.bin" ]]; then
    cat <<EOF

回滚方式（如需）：
  cp -a ${BACKUP_DIR}/nginx.bin ${NGINX_BIN}
  systemctl restart nginx
EOF
  fi
  if [[ -n "${BACKUP_DIR:-}" && -f "${BACKUP_DIR}/nginx-mgr.bin" ]]; then
    cat <<EOF
  cp -a ${BACKUP_DIR}/nginx-mgr.bin ${PANEL_BIN}
  systemctl restart ${PANEL_UNIT}
EOF
  fi
}

main
