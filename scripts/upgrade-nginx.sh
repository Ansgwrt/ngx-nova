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
#   ./upgrade-nginx.sh --panel --panel-release v1.0.4   # 指定 Release 版本（显式指定时优先走 Release）
#   ./upgrade-nginx.sh --panel --panel-allow-older      # 允许降级（别名 --panel-force）
#   ./upgrade-nginx.sh --panel --panel-src /root/nginx-mgr-linux-arm64   # 离线：用本地文件
#   ./upgrade-nginx.sh --fix-ssl-zone     # 把各处的 ssl_session_cache shared:SSL 尺寸归一化到主配置
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
ALLOW_OLDER=0
PANEL=0
PANEL_SRC=""
# 默认从镜像提取面板二进制；Docker Hub 优先，拉不到自动回落 GHCR
if [[ -n "${PANEL_IMAGE:-}" ]]; then
  PANEL_IMAGES=("$PANEL_IMAGE")
else
  PANEL_IMAGES=(ansgwrt/ngx-nova:latest ghcr.io/ansgwrt/ngx-nova:latest)
fi
PANEL_EXTRACT_DIR=""
# 二进制安装场景的首选来源：GitHub Release 资产（不需要 docker）
PANEL_REPO="${PANEL_REPO:-Ansgwrt/ngx-nova}"
PANEL_RELEASE="${PANEL_RELEASE:-latest}"
# 用户显式给了 --panel-release 时，Release 优先于镜像（镜像跟随 main，可能比该 tag 新，
# 但不该覆盖用户的显式意图）
PANEL_RELEASE_EXPLICIT=0
# 共享内存区体检：发现同名 zone 多个尺寸时，是否按主配置自动归一化
FIX_SSL_ZONE=0
# 归一化时改过的配置文件备份目录（供结尾汇总打印）
SSLZONE_BACKUP=""
# 面板二进制路径不写死：真实路径由 systemd 单元的 ExecStart 决定。
# 踩过：单元指向 /opt/nginx-mgr/nginx-mgr，而脚本硬编码 /usr/local/bin/nginx-mgr，
# 结果替换了一个根本没被使用的文件 —— 服务重启后仍是旧二进制，健康检查还返回 200。
PANEL_BIN="${PANEL_BIN:-}"
PANEL_TOKENCTL=""
PANEL_UNIT="${PANEL_UNIT:-nginx-mgr}"
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

usage() { sed -n '2,24p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    -v|--version) TARGET_VERSION="${2:?缺少版本号}"; shift 2 ;;
    -n|--dry-run) DRY_RUN=1; shift ;;
    -y|--yes)     ASSUME_YES=1; shift ;;
    --install-rust) INSTALL_RUST=1; shift ;;
    --panel)      PANEL=1; shift ;;
    --panel-src)  PANEL=1; PANEL_SRC="${2:?缺少路径}"; shift 2 ;;
    --panel-image) PANEL=1; PANEL_IMAGES=("${2:?缺少镜像名}"); shift 2 ;;
    --panel-release) PANEL=1; PANEL_RELEASE="${2:?缺少版本，如 v1.0.4}"; PANEL_RELEASE_EXPLICIT=1; shift 2 ;;
    --panel-allow-older|--panel-force) ALLOW_OLDER=1; shift ;;
    --fix-ssl-zone) FIX_SSL_ZONE=1; shift ;;
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

# ------------------------------------------- 共享内存区体检（ssl_session_cache）
# nginx 里同名共享内存区整份配置只能声明一次，多处声明时 size 必须完全一致，否则：
#   [emerg] the size 10485760 of shared memory zone "SSL" conflicts with
#           already declared size 31457280 in /etc/nginx/sites-enabled/<domain>:45
# 面板 v1.0.4 起不再把 ssl_session_cache 写进站点模板，但历史站点里可能还留着，
# 主配置一改尺寸就会复发。这里做体检；给 --fix-ssl-zone 时按主配置尺寸归一化。
# 返回 0 = 无冲突（或已修复），1 = 有冲突且未修复。
ssl_zone_preflight() {
  local conf_dir; conf_dir="$(dirname "$NGINX_CONF")"
  local hits sizes n main_size
  hits="$(grep -rnE '^[[:space:]]*ssl_session_cache[[:space:]]+shared:SSL:' "$conf_dir" 2>/dev/null || true)"
  [[ -n "$hits" ]] || return 0

  sizes="$(printf '%s\n' "$hits" | sed -nE 's/.*shared:SSL:([0-9]+[kKmMgG]?).*/\1/p' | sort -u)"
  n="$(printf '%s\n' "$sizes" | grep -c . || true)"
  if [[ "${n:-0}" -le 1 ]]; then
    ok "共享内存区尺寸一致: shared:SSL:$(printf '%s' "$sizes")"
    return 0
  fi

  warn "同名共享内存区 shared:SSL 出现多个尺寸，nginx -t 会直接失败："
  printf '%s\n' "$hits" | sed 's/^/     /' | tee -a "$LOG"

  main_size="$(printf '%s\n' "$hits" | grep -E "^${NGINX_CONF}:" \
    | sed -nE 's/.*shared:SSL:([0-9]+[kKmMgG]?).*/\1/p' | head -1 || true)"

  if [[ $FIX_SSL_ZONE -eq 0 ]]; then
    warn "把它们统一成同一个尺寸即可（面板 v1.0.4+ 的基线是 10m）"
    if [[ -n "$main_size" ]]; then
      warn "  主配置当前: shared:SSL:${main_size}"
    fi
    warn "  或执行: $(basename "$0") --fix-ssl-zone（按主配置归一化，自动备份）"
    return 1
  fi
  [[ -n "$main_size" ]] || die "--fix-ssl-zone 需要主配置 ${NGINX_CONF} 里先声明 ssl_session_cache shared:SSL:<size>"

  # 只动"尺寸与主配置不同"的文件；主配置本身永远不改
  local targets
  targets="$(printf '%s\n' "$hits" \
    | sed -nE 's#^([^:]+):[0-9]+:.*shared:SSL:([0-9]+[kKmMgG]?).*#\1 \2#p' \
    | awk -v want="$main_size" '$2 != want { print $1 }' | sort -u)"
  if [[ -z "$targets" ]]; then
    ok "各文件尺寸已与主配置一致（shared:SSL:${main_size}），无需改动"
    return 0
  fi

  if [[ $DRY_RUN -eq 1 ]]; then
    log "[预演] 将把下列文件里的 shared:SSL 归一化为 ${main_size}："
    printf '%s\n' "$targets" | sed 's/^/     /' | tee -a "$LOG"
    return 1
  fi

  local backup="${BACKUP_ROOT}/sslzone-${STAMP}" f changed=0
  mkdir -p "$backup"
  SSLZONE_BACKUP="$backup"
  while IFS= read -r f; do
    [[ -n "$f" && -f "$f" ]] || continue
    cp -a "$f" "${backup}/$(printf '%s' "${f#/}" | tr '/' '_')"
    sed -i -E "s/(ssl_session_cache[[:space:]]+shared:SSL:)[0-9]+[kKmMgG]?;/\1${main_size};/" "$f"
    changed=$((changed + 1))
  done <<< "$targets"
  ok "已把 ${changed} 个文件归一化为 shared:SSL:${main_size}（备份 ${backup}）"

  if "$NGINX_BIN" -t >/dev/null 2>&1; then
    ok "nginx -t 通过"
    return 0
  fi
  warn "nginx -t 仍失败，请手动检查（未自动回滚）："
  "$NGINX_BIN" -t 2>&1 | tail -5 | tee -a "$LOG"
  return 1
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


# ---------------------------------------------------------------- 二进制识别

# 直接读 ELF 头识别架构，不依赖 file 命令。
# 踩过：最小化 Debian 没装 file 包，脚本在架构校验处 127 退出。
# 输出：x86-64 / aarch64 / armv7 / elf32 / not-elf / machine-<n> / missing
elf_arch() {
  local f="$1"
  [[ -f "$f" ]] || { echo "missing"; return 1; }
  local magic cls mach
  magic="$(od -An -tx1 -N4 "$f" 2>/dev/null | tr -d ' \n')"
  [[ "$magic" == "7f454c46" ]] || { echo "not-elf"; return 1; }
  cls="$(od -An -tu1 -j4 -N1 "$f" 2>/dev/null | tr -d ' \n')"
  [[ "$cls" == "2" ]] || { echo "elf32"; return 1; }
  mach="$(od -An -tu2 -j18 -N2 "$f" 2>/dev/null | tr -d ' \n')"
  case "$mach" in
    62)  echo "x86-64" ;;
    183) echo "aarch64" ;;
    40)  echo "armv7" ;;
    "")  echo "unknown" ;;
    *)   echo "machine-${mach}" ;;
  esac
}

# 当前架构期望的 ELF 标识
elf_arch_expected() {
  case "$ARCH" in
    amd64) echo "x86-64" ;;
    arm64) echo "aarch64" ;;
    armv7) echo "armv7" ;;
    *)     echo "" ;;
  esac
}

# 从二进制里取构建戳（NGXBUILD:YYYYMMDDTHHMMSSZ）。
# 旧构建没有这个标记，返回空 —— 调用方需按"无法判定"处理。
binary_build_stamp() {
  [[ -f "$1" ]] || return 0
  # 找不到时报 1 + pipefail 会让 set -e 中断整个脚本（踩过），末尾吞掉状态
  { grep -aoE 'NGXBUILD:[0-9]{8}T[0-9]{6}Z' "$1" 2>/dev/null || true; } | head -1 || true
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


# 从 GitHub Release 下载对应架构的包（二进制安装的首选更新方式，无需 docker）
fetch_panel_from_release() {
  command -v curl >/dev/null 2>&1 || return 1

  local base url
  base="https://github.com/${PANEL_REPO}/releases"
  if [[ "$PANEL_RELEASE" == "latest" ]]; then
    url="${base}/latest/download/nginx-mgr-linux-${ARCH}.tar.gz"
  else
    url="${base}/download/${PANEL_RELEASE}/nginx-mgr-linux-${ARCH}.tar.gz"
  fi

  log "尝试 GitHub Release: ${url}"
  local dir; dir="$(mktemp -d)"
  if ! curl -fsSL --retry 2 --max-time 300 -o "${dir}/pkg.tar.gz" "$url"; then
    warn "  下载失败（Release 不存在、资产名不匹配或网络不通），跳过"
    rm -rf "$dir"; return 1
  fi

  # 有 .sha256 资产就校验，缺失则跳过（旧版本 Release 可能没有）
  if curl -fsSL --retry 1 --max-time 60 -o "${dir}/pkg.sha256" "${url}.sha256" 2>/dev/null; then
    if ( cd "$dir" && sed "s#\*\?nginx-mgr-linux-${ARCH}.tar.gz#pkg.tar.gz#" pkg.sha256 | sha256sum -c - >/dev/null 2>&1 ); then
      ok "  Release 校验和匹配"
    else
      warn "  校验和不匹配，拒绝使用该资产"
      rm -rf "$dir"; return 1
    fi
  else
    warn "  未找到 .sha256 资产，跳过校验"
  fi

  if ! tar -xzf "${dir}/pkg.tar.gz" -C "$dir" 2>/dev/null; then
    warn "  解压失败，跳过"
    rm -rf "$dir"; return 1
  fi

  if [[ ! -f "${dir}/nginx-mgr-linux-${ARCH}" ]]; then
    warn "  包内没有 nginx-mgr-linux-${ARCH}，跳过"
    rm -rf "$dir"; return 1
  fi

  # 统一成后续流程期望的文件名
  mv -f "${dir}/nginx-mgr-linux-${ARCH}" "${dir}/nginx-mgr"
  if [[ -f "${dir}/tokenctl-linux-${ARCH}" ]]; then
    mv -f "${dir}/tokenctl-linux-${ARCH}" "${dir}/tokenctl"
  fi
  chmod +x "${dir}/nginx-mgr"
  rm -f "${dir}/pkg.tar.gz"
  PANEL_EXTRACT_DIR="$dir"
  ok "已从 Release 取得二进制（${PANEL_RELEASE}）"
  return 0
}

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
      local got want; got="$(elf_arch "${dir}/nginx-mgr" || true)"; want="$(elf_arch_expected)"
      if [[ -z "$want" || "$got" != "$want" ]]; then
        warn "  镜像内二进制架构不符（期望 ${ARCH}/${want:-未知}，实际 ${got:-未知}）"
        docker rm -f "$cid" >/dev/null 2>&1 || true; rm -rf "$dir"; continue
      fi
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


# 解析面板二进制真实路径：优先 systemd 单元 ExecStart，其次常见安装位置
detect_panel_bin() {
  if [[ -n "$PANEL_BIN" ]]; then
    log "面板二进制（由环境变量指定）: ${PANEL_BIN}"
  else
    local p=""
    if command -v systemctl >/dev/null 2>&1; then
      p="$(systemctl show -p ExecStart --value "$PANEL_UNIT" 2>/dev/null \
           | sed -n 's/.*path=\([^ ;]*\).*/\1/p' | head -1)"
      if [[ -z "$p" ]]; then
        p="$(systemctl cat "$PANEL_UNIT" 2>/dev/null | sed -n 's/^ExecStart=//p' | head -1 | awk '{print $1}')"
      fi
    fi
    if [[ -z "$p" ]]; then
      local cand
      for cand in /opt/nginx-mgr/nginx-mgr /usr/local/bin/nginx-mgr /usr/bin/nginx-mgr; do
        if [[ -f "$cand" ]]; then p="$cand"; break; fi
      done
    fi
    PANEL_BIN="${p:-/usr/local/bin/nginx-mgr}"
    log "面板二进制: ${PANEL_BIN}（解析自单元 ${PANEL_UNIT}）"
  fi

  # tokenctl 跟随面板同目录，避免又出现"更新了另一个路径"
  local dir; dir="$(dirname "$PANEL_BIN")"
  if [[ -f "${dir}/tokenctl" ]]; then
    PANEL_TOKENCTL="${dir}/tokenctl"
  elif [[ -f /usr/local/bin/tokenctl ]]; then
    PANEL_TOKENCTL="/usr/local/bin/tokenctl"
  fi
}

# 是否已安装面板二进制（按常见路径探测，不改动 PANEL_BIN）
panel_present() {
  local cand
  for cand in "${PANEL_BIN:-}" /opt/nginx-mgr/nginx-mgr /usr/local/bin/nginx-mgr /usr/bin/nginx-mgr; do
    if [[ -n "$cand" && -f "$cand" ]]; then return 0; fi
  done
  return 1
}

# 运行中的面板进程是否就是磁盘上这个二进制（inode 相同）。
# 只验证 HTTP 200 会漏掉"服务重启了但跑的是另一个路径"的情况。
# 面板主进程 PID。
# 踩过：`pgrep -f "$(basename ...)"` 会命中命令行里恰好含 "nginx-mgr" 的普通 shell
# （比如 ssh 里手敲的命令），拿到错误 PID 后误判"跑的不是新二进制"，进而回滚新版本。
# 优先用 systemd 的 MainPID；退化时按 /proc/<pid>/exe 的真实路径精确匹配。
panel_pid() {
  local pid=""
  if command -v systemctl >/dev/null 2>&1; then
    pid="$(systemctl show -p MainPID --value "$PANEL_UNIT" 2>/dev/null | tr -d ' ' || true)"
    [[ "$pid" =~ ^[0-9]+$ && "$pid" -gt 0 ]] || pid=""
  fi
  if [[ -z "$pid" ]]; then
    local want p real
    want="$(readlink -f "$PANEL_BIN" 2>/dev/null || echo "$PANEL_BIN")"
    for p in /proc/[0-9]*; do
      real="$(readlink -f "${p}/exe" 2>/dev/null || true)"
      real="${real% (deleted)}"
      if [[ -n "$real" && "$real" == "$want" ]]; then pid="${p#/proc/}"; break; fi
    done
  fi
  echo "$pid"
}

panel_running_matches() {
  local i pid a b
  # 重启瞬间 systemd 可能还报着旧 PID，给它几秒稳定下来
  for i in 1 2 3 4 5 6 7 8 9 10; do
    pid="$(panel_pid)"
    if [[ -n "$pid" && -e "/proc/$pid/exe" ]]; then
      a="$(stat -Lc '%d:%i' "/proc/$pid/exe" 2>/dev/null || true)"
      b="$(stat -Lc '%d:%i' "$PANEL_BIN" 2>/dev/null || true)"
      [[ -n "$a" && "$a" == "$b" ]] && return 0
    fi
    sleep 0.5
  done
  return 1
}

# 运行中进程的 exe 路径（便于报错时定位）
panel_running_exe() {
  local pid; pid="$(panel_pid)"
  if [[ -n "$pid" && -e "/proc/$pid/exe" ]]; then
    readlink -f "/proc/$pid/exe" 2>/dev/null || true
  fi
}

# 运行中进程内嵌的构建戳
panel_running_stamp() {
  local pid; pid="$(panel_pid)"
  [[ -n "$pid" && -e "/proc/$pid/exe" ]] || return 0
  { grep -aoE 'NGXBUILD:[0-9]{8}T[0-9]{6}Z' "/proc/$pid/exe" 2>/dev/null || true; } | head -1 || true
}


# 回滚面板二进制：写临时文件后 rename。
# 直接 cp 覆盖正在执行的二进制会报 "Text file busy"（实测踩到，回滚会静默失败）。
rollback_panel() {
  [[ -f "${BACKUP_DIR}/nginx-mgr.bin" ]] || { warn "无备份可回滚: ${BACKUP_DIR}/nginx-mgr.bin"; return 1; }
  install -m 0755 "${BACKUP_DIR}/nginx-mgr.bin" "${PANEL_BIN}.rollback" || return 1
  mv -f "${PANEL_BIN}.rollback" "$PANEL_BIN" || return 1
  if [[ -f "${BACKUP_DIR}/tokenctl.bin" && -n "$PANEL_TOKENCTL" ]]; then
    install -m 0755 "${BACKUP_DIR}/tokenctl.bin" "${PANEL_TOKENCTL}.rollback" 2>/dev/null \
      && mv -f "${PANEL_TOKENCTL}.rollback" "$PANEL_TOKENCTL" || true
  fi
  systemctl restart "$PANEL_UNIT" >/dev/null 2>&1 || true
  warn "已回滚到备份二进制"
}

# ---------------------------------------------------------------- 面板更新

panel_health() {
  local code
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "http://127.0.0.1:${PANEL_PORT}/ui/" || echo 000)"
  [[ "$code" == "200" ]]
}

update_panel() {
  log "=== 更新面板（nginx-mgr）==="
  detect_panel_bin
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

  # 2) 没有本地文件：显式 --panel-release 先走 Release（尊重用户意图）；
  #    未指定时才让镜像优先（镜像跟随 main 构建，通常比 tag 对应的 Release 新）
  if [[ -z "$src" ]]; then
    if [[ $DRY_RUN -eq 1 ]]; then
      if [[ $PANEL_RELEASE_EXPLICIT -eq 1 ]]; then
        log "[预演] 面板来源优先级：本地文件 → GitHub Release(${PANEL_RELEASE})（显式指定）→ 镜像(${PANEL_IMAGES[*]})"
      else
        log "[预演] 面板来源优先级：本地文件 → 镜像(${PANEL_IMAGES[*]}) → GitHub Release(${PANEL_RELEASE})"
      fi
      log "[预演] 将备份 ${PANEL_BIN} 并 restart ${PANEL_UNIT}"
      return 0
    fi

    if [[ $PANEL_RELEASE_EXPLICIT -eq 1 ]]; then
      # 用户点了版本号，就按版本号装；镜像只作兜底
      if fetch_panel_from_release; then
        src="${PANEL_EXTRACT_DIR}/nginx-mgr"
        tk="${PANEL_EXTRACT_DIR}/tokenctl"
        ok "面板来源: GitHub Release(${PANEL_RELEASE})，按 --panel-release 显式指定"
      elif command -v docker >/dev/null 2>&1; then
        warn "Release(${PANEL_RELEASE}) 取不到，回退镜像：构建戳可能比该 tag 更新"
        if extract_panel_from_image; then
          src="${PANEL_EXTRACT_DIR}/nginx-mgr"
          tk="${PANEL_EXTRACT_DIR}/tokenctl"
        fi
      fi
    elif command -v docker >/dev/null 2>&1; then
      if extract_panel_from_image; then
        src="${PANEL_EXTRACT_DIR}/nginx-mgr"
        tk="${PANEL_EXTRACT_DIR}/tokenctl"
      fi
    else
      log "未检测到 docker，改用 GitHub Release 下载（二进制安装场景）"
    fi
  fi

  # 3) 未显式指定版本，且镜像没拿到（无 docker / 拉取失败 / 架构不符）→ 退回 Release
  if [[ -z "$src" && $PANEL_RELEASE_EXPLICIT -eq 0 ]] && fetch_panel_from_release; then
    src="${PANEL_EXTRACT_DIR}/nginx-mgr"
    tk="${PANEL_EXTRACT_DIR}/tokenctl"
    warn "Release 资产对应 tag ${PANEL_RELEASE}，如需 main 上的最新构建请用 --panel-src 或镜像"
  fi

  # 4) 全部失败
  if [[ -z "$src" ]]; then
    die "获取面板二进制失败，已尝试全部来源：
        · 本地文件：脚本同目录 / ./ / /root/ 下的 nginx-mgr-linux-${ARCH}
        · 容器镜像：${PANEL_IMAGES[*]}（当前机器有/无 docker 见上）
        · GitHub Release：github.com/${PANEL_REPO} (${PANEL_RELEASE})
      排查建议：
        1) 二进制安装机器通常没有 docker —— 用 --panel-release latest 走 Release
        2) Release 未发布或资产名不符 —— 检查 releases 页面
        3) 镜像里 ${ARCH} 二进制架构不对（构建参数写错）—— 需重建镜像
      兜底：--panel-src /path/nginx-mgr-linux-${ARCH}"
  fi

  # 5) 显式给定的 --panel-src 允许是 URL
  if [[ "$src" =~ ^https?:// ]]; then
    local dl; dl="$(mktemp -d)/nginx-mgr"
    log "下载面板二进制: $src"
    curl -fsSL --retry 3 --max-time 300 -o "$dl" "$src"
    src="$dl"
    tk="${dl%/*}/tokenctl-linux-${ARCH}"
  fi
  [[ -f "$src" ]] || die "面板二进制不存在: $src"
  src="$(readlink -f "$src")"

  # 架构校验，防止把 amd64 传上 arm64 机器（读 ELF 头，不依赖 file 命令）
  local info want; info="$(elf_arch "$src" || true)"; want="$(elf_arch_expected)"
  case "$info" in
    x86-64|aarch64|armv7) : ;;
    *) die "不是可用的 64 位 ELF（识别结果: ${info:-未知}）: $(basename "$src")" ;;
  esac
  [[ -z "$want" || "$info" == "$want" ]] || die "架构不匹配（期望 ${want}，实际 ${info}）: $(basename "$src")"
  ok "二进制校验通过（${ARCH}）: $(basename "$src")"

  # ---- 拒绝降级 ----
  # Release 资产对应 tag，可能落后于镜像/main 构建；镜像修 bug 期间也可能退回旧 Release。
  # 拿构建戳比较，避免把旧前端/旧修复无声地装回去。
  local new_stamp old_stamp
  new_stamp="$(binary_build_stamp "$src" || true)"
  old_stamp=""
  if [[ -f "$PANEL_BIN" ]]; then
    old_stamp="$(binary_build_stamp "$PANEL_BIN" || true)"
  fi

  if [[ -n "$new_stamp" && -n "$old_stamp" ]]; then
    if [[ "$new_stamp" < "$old_stamp" ]]; then
      [[ $ALLOW_OLDER -eq 1 ]] || die "拒绝降级：待安装的构建早于已安装版本
        待安装: ${new_stamp}
        已安装: ${old_stamp}
      确认要降级请加 --panel-allow-older"
      warn "待安装 ${new_stamp} 早于已安装 ${old_stamp}，按 --panel-allow-older 继续"
    elif [[ "$new_stamp" == "$old_stamp" ]]; then
      ok "构建戳一致（${new_stamp}）"
    fi
  elif [[ -z "$new_stamp" && -n "$old_stamp" ]]; then
    [[ $ALLOW_OLDER -eq 1 ]] || die "拒绝降级：待安装的二进制没有构建戳（旧构建），
      而当前已安装版本带构建戳 ${old_stamp}，说明来源是更早的包。
      请用镜像 / --panel-src / 更新的 Release；确认要覆盖请加 --panel-allow-older"
    warn "待安装二进制无构建戳，已按 --panel-allow-older 继续"
  elif [[ -n "$new_stamp" && -z "$old_stamp" ]]; then
    ok "当前安装版本无构建戳（旧构建），本次为升级（${new_stamp}）"
  else
    warn "两侧都没有构建戳，无法自动判断新旧"
    warn "  待安装: $(sha256sum "$src" | cut -c1-16)…  ${PANEL_SRC:-${PANEL_RELEASE:-未知来源}}"
    if [[ -f "$PANEL_BIN" ]]; then
      warn "  已安装: $(sha256sum "$PANEL_BIN" | cut -c1-16)…  ${PANEL_BIN}"
    fi
    if [[ $ALLOW_OLDER -eq 0 ]]; then
      if [[ $ASSUME_YES -eq 0 && -t 0 ]]; then
        read -r -p "继续安装可能覆盖更新的版本，确认？[y/N] " ans
        [[ "$ans" =~ ^[Yy]$ ]] || { log "已取消"; return 0; }
      else
        die "无法判断新旧且非交互运行，已中止。确认继续请加 --panel-allow-older"
      fi
    fi
  fi

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

  # tokenctl 与面板同版本、同目录，一并更新（存在才动）
  if [[ -n "$tk" && -f "$tk" && -n "$PANEL_TOKENCTL" ]]; then
    if [[ -f "$PANEL_TOKENCTL" ]]; then
      cp -a "$PANEL_TOKENCTL" "${BACKUP_DIR}/tokenctl.bin"
    fi
    install -m 0755 "$tk" "$PANEL_TOKENCTL"
    ok "tokenctl 已更新: ${PANEL_TOKENCTL}"
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
      # 200 只说明"有个进程在服务"，还要确认它跑的就是刚装的文件
      if ! panel_running_matches; then
        warn "服务在跑，但运行的二进制不是 ${PANEL_BIN}（/proc/<pid>/exe inode 不一致）"
        warn "常见原因：单元 ExecStart 指向别的路径，或服务未被 ${PANEL_UNIT} 管理"
        warn "  运行中的 exe: $(panel_running_exe || echo 未知)"
        rollback_panel
        die "面板未真正生效，已回滚。检查：systemctl cat ${PANEL_UNIT} | grep ExecStart"
      fi
      local rs; rs="$(panel_running_stamp || true)"
      if [[ -n "$new_stamp" && -n "$rs" && "$rs" != "$new_stamp" ]]; then
        warn "运行中的构建戳 ${rs} 与目标 ${new_stamp} 不一致"
      fi
      ok "运行态确认: ${PANEL_BIN} 已是新二进制${rs:+（${rs}）}"
      # 面板换完了，顺手确认 nginx 配置仍能通过 —— 站点操作失败时能第一时间定位
      if "$NGINX_BIN" -t >/dev/null 2>&1; then
        ok "nginx -t 通过"
      else
        warn "nginx -t 失败：面板已更新，但站点增删改会继续报错"
        "$NGINX_BIN" -t 2>&1 | tail -5 | tee -a "$LOG"
        ssl_zone_preflight || true
      fi
      [[ -n "$PANEL_EXTRACT_DIR" ]] && rm -rf "$PANEL_EXTRACT_DIR"
      return 0
    fi
  done

  warn "面板启动后健康检查失败，开始回滚"
  rollback_panel || true
  systemctl --no-pager status "$PANEL_UNIT" 2>&1 | tail -12
  die "面板更新失败，已回滚到旧二进制"
}

main() {
  log "=== 升级开始 ==="
  detect_arch
  check_nginx

  # 共享内存区体检：同名 zone 多个尺寸时任何一次 nginx -t 都会失败。
  # 只提示不阻塞（面板升级本身可能就是修复手段），--fix-ssl-zone 才动配置。
  ssl_zone_preflight || true

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
  if [[ -n "${SSLZONE_BACKUP:-}" ]]; then
    ok "配置归一化备份: ${SSLZONE_BACKUP}"
  fi
  ok "日志文件: ${LOG}"

  # 面板是独立组件，默认不动；不提示的话很容易误以为"升级脚本跑完就全好了"
  if [[ $PANEL -eq 0 ]] && panel_present; then
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
