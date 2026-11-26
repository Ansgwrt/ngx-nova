#!/usr/bin/env bash
# 给已经装好的 nginx（ngx-nova 源码编译版）补上 ACME 模块。
#
# 背景：nginx.org 的源码包**不含** ACME 模块，`acme_certificate` / `$acme_certificate`
# 这些指令来自第三方项目 https://github.com/nginx/nginx-acme（Rust 实现），
# 只能编成动态模块再 load_module。bundle 里的 `--with-http_acme_module` 从来不是
# nginx 的 configure 选项，所以老版本装完永远是 acme=false。
#
# 用法：
#   bash scripts/install-acme-module.sh                    # 自动探测源码树与模块目录
#   bash scripts/install-acme-module.sh --nginx-src /usr/local/src/nginx-build/1.30.7/nginx-1.30.7
#   bash scripts/install-acme-module.sh --skip-deps        # 依赖已齐，跳过 apt / rustup
#   bash scripts/install-acme-module.sh --dry-run          # 只打印将要做什么
#
# 完成后 nginx -t 通过 → 站点模板可用 acme_certificate letsencrypt 自动签发 Let's Encrypt 证书。
set -euo pipefail

NGINX_SBIN="${NGINX_SBIN:-/usr/sbin/nginx}"
NGINX_PREFIX="${NGINX_PREFIX:-/usr/local/nginx}"
CONF_DIR="${CONF_DIR:-/etc/nginx}"
MODULE_SRC="/usr/local/src/nginx-acme"
NGINX_SRC=""
SKIP_DEPS=0
DRY_RUN=0

log() { printf '\033[36m[acme]\033[0m %s\n' "$*"; }
warn() { printf '\033[33m[acme]\033[0m %s\n' "$*" >&2; }
die() { printf '\033[31m[acme]\033[0m %s\n' "$*" >&2; exit 1; }

while [ $# -gt 0 ]; do
  case "$1" in
    --nginx-src) NGINX_SRC="${2:-}"; shift 2 ;;
    --module-src) MODULE_SRC="${2:-}"; shift 2 ;;
    --prefix) NGINX_PREFIX="${2:-}"; shift 2 ;;
    --conf-dir) CONF_DIR="${2:-}"; shift 2 ;;
    --skip-deps) SKIP_DEPS=1; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    *) die "未知参数: $1" ;;
  esac
done

run() {
  if [ "$DRY_RUN" = 1 ]; then echo "+ $*"; else "$@"; fi
}

[ "$(id -u)" = 0 ] || die "需要 root 运行"
[ -x "$NGINX_SBIN" ] || die "找不到 nginx 二进制: $NGINX_SBIN"

NGINX_VER="$("$NGINX_SBIN" -v 2>&1 | sed -n 's#.*nginx/\([0-9.]*\).*#\1#p')"
log "nginx 版本: ${NGINX_VER:-未知}"

# 动态模块要求主二进制带 --with-compat，否则 load_module 会报 signature 不匹配
if ! "$NGINX_SBIN" -V 2>&1 | grep -q -- '--with-compat'; then
  warn "当前 nginx 未使用 --with-compat 编译，动态模块可能加载失败（signature mismatch）"
fi

# 1) 源码树：必须与运行中的 nginx 版本一致且已 configure
if [ -z "$NGINX_SRC" ]; then
  for d in /usr/local/src/nginx-build/*/nginx-"$NGINX_VER" /usr/local/src/nginx-"$NGINX_VER" /root/nginx-"$NGINX_VER"; do
    [ -f "$d/configure" ] && NGINX_SRC="$d" && break
  done
fi
[ -n "$NGINX_SRC" ] && [ -f "$NGINX_SRC/configure" ] || die "未找到 nginx ${NGINX_VER} 源码树，请用 --nginx-src 指定"
log "nginx 源码: $NGINX_SRC"

# 2) 依赖：clang/libclang（rust-bindgen）、pkg-config、开发头文件、Rust 工具链
if [ "$SKIP_DEPS" = 0 ]; then
  if ! ldconfig -p 2>/dev/null | grep -q libclang || ! command -v pkg-config >/dev/null; then
    log "安装编译依赖"
    run apt-get install -y --no-install-recommends \
      clang libclang-dev pkg-config libssl-dev libpcre2-dev zlib1g-dev \
      git build-essential ca-certificates curl
  fi
  if ! command -v cargo >/dev/null && [ ! -x "$HOME/.cargo/bin/cargo" ]; then
    log "安装 Rust 工具链（rustup minimal）"
    run bash -lc "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal --default-toolchain stable"
  fi
fi
export PATH="$HOME/.cargo/bin:/usr/local/cargo/bin:$PATH"
command -v cargo >/dev/null || die "cargo 不可用"
log "cargo: $(cargo --version)"

# 3) 模块源码
if [ ! -f "$MODULE_SRC/Cargo.toml" ]; then
  log "克隆 nginx-acme → $MODULE_SRC"
  run mkdir -p "$(dirname "$MODULE_SRC")"
  run rm -rf "$MODULE_SRC"
  run git clone --depth 1 https://github.com/nginx/nginx-acme "$MODULE_SRC"
fi

# 4) configure（模块绑定需要 objs/ngx_auto_config.h，参数与运行中的二进制保持一致）
if [ ! -f "$NGINX_SRC/objs/ngx_auto_config.h" ]; then
  ARGS="$("$NGINX_SBIN" -V 2>&1 | sed -n 's/^configure arguments: //p')"
  log "configure 源码树（沿用现有编译参数）"
  if [ "$DRY_RUN" = 1 ]; then
    echo "+ (cd $NGINX_SRC && eval ./configure $ARGS)"
  else
    ( cd "$NGINX_SRC" && eval "./configure $ARGS" ) >/tmp/ngx-acme-configure.log 2>&1 \
      || die "configure 失败，见 /tmp/ngx-acme-configure.log"
  fi
fi

# 5) 编译模块（低内存机器固定单并发）
log "cargo build（首次约 5-15 分钟）"
if [ "$DRY_RUN" = 1 ]; then
  echo "+ (cd $MODULE_SRC && NGINX_BUILD_DIR=$NGINX_SRC/objs cargo build --release -j 1)"
else
  ( cd "$MODULE_SRC" && NGINX_BUILD_DIR="$NGINX_SRC/objs" CARGO_BUILD_JOBS=1 cargo build --release -j 1 )
fi
SO="$MODULE_SRC/target/release/libnginx_acme.so"
[ "$DRY_RUN" = 1 ] || [ -s "$SO" ] || die "未生成 $SO"

DST_DIR="$NGINX_PREFIX/modules"
run mkdir -p "$DST_DIR"
run install -m 755 "$SO" "$DST_DIR/ngx_http_acme_module.so"
log "模块已安装: $DST_DIR/ngx_http_acme_module.so"

# 6) 主配置接线：load_module + resolver + acme_shared_zone（幂等）
MAIN_CONF="$CONF_DIR/nginx.conf"
[ -f "$MAIN_CONF" ] || die "找不到 $MAIN_CONF"
if [ "$DRY_RUN" = 0 ]; then
  cp -a "$MAIN_CONF" "$MAIN_CONF.pre-acme.$(date +%Y%m%d%H%M%S)"
  python3 - "$MAIN_CONF" <<'PY'
import re, sys
p = sys.argv[1]
s = open(p).read()
if "ngx_http_acme_module.so" not in s:
    s = "load_module modules/ngx_http_acme_module.so;\n\n" + s
if "http {" in s:
    inject = ""
    if "acme_shared_zone" not in s:
        inject += "    acme_shared_zone zone=ngx_acme_shared:1M;\n"
    if re.search(r"(?m)^\s*resolver\s", s) is None:
        inject += "    resolver 1.1.1.1 8.8.8.8 ipv6=off valid=300s;\n"
    if inject:
        i = s.index("http {") + len("http {")
        s = s[:i] + "\n" + inject + s[i:]
open(p, "w").write(s)
print("主配置已更新")
PY
else
  echo "+ patch $MAIN_CONF"
fi

# 7) issuer 配置
mkdir -p "$CONF_DIR/conf.d" "$CONF_DIR/acme"
ISSUER="$CONF_DIR/conf.d/00-acme-issuer.conf"
if [ ! -f "$ISSUER" ]; then
  run tee "$ISSUER" >/dev/null <<CONF
# 由 install-acme-module.sh 生成：nginx-acme 的 Let's Encrypt 签发器。
acme_issuer letsencrypt {
    uri              https://acme-v02.api.letsencrypt.org/directory;
    state_path       $CONF_DIR/acme;
    accept_terms_of_service;
}
CONF
  log "已写入 $ISSUER"
fi

# 8) 校验
if [ "$DRY_RUN" = 1 ]; then
  echo "+ $NGINX_SBIN -t"
  exit 0
fi
if "$NGINX_SBIN" -t; then
  log "✅ nginx -t 通过，重载生效"
  systemctl reload nginx 2>/dev/null || "$NGINX_SBIN" -s reload
  log "现在可以在站点 server{} 里写："
  log "    acme_certificate letsencrypt;"
  log "    ssl_certificate     \$acme_certificate;"
  log "    ssl_certificate_key \$acme_certificate_key;"
else
  warn "nginx -t 失败，已保留备份，请检查 $MAIN_CONF"
  exit 1
fi
