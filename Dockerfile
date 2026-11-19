# syntax=docker/dockerfile:1.7
#
# ngx-nova 多架构镜像（linux/amd64 + linux/arm64）
#   - Go 面板在 BUILDPLATFORM 上交叉编译（不依赖 QEMU，快）
#   - nginx 从官方源码按固定 SHA-256 编译，容器内即为已修复版本
#
# 构建示例：
#   docker buildx build --platform linux/amd64,linux/arm64 \
#     -t <dockerhub-user>/ngx-nova:1.30.7 -t <dockerhub-user>/ngx-nova:latest --push .

ARG NGINX_VERSION=1.30.7
# 与 internal/service/nginx_build.go 中 pinnedNginxSources 保持一致
ARG NGINX_SHA256=2565b5c837050e958f70fb0f73c48e2bca4542ad349fd356f46fb0c72610bc6e

# ---------- 1. 编译面板（go），按 TARGETARCH 交叉编译 ----------
FROM --platform=$BUILDPLATFORM golang:1.25-bookworm AS appbuilder
WORKDIR /src
ENV CGO_ENABLED=0
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# 注意：这里必须「不带默认值」地重新声明，才能继承 buildx 自动注入的目标架构。
# 写成 ARG TARGETARCH=amd64 会把这个默认值当成实际值，导致 arm64 镜像里装 amd64 二进制。
ARG TARGETOS
ARG TARGETARCH
RUN set -eu; \
    goos="${TARGETOS:-linux}"; \
    goarch="${TARGETARCH:-$(go env GOARCH)}"; \
    stamp="NGXBUILD:$(date -u +%Y%m%dT%H%M%SZ)"; \
    echo ">>> 交叉编译目标: ${goos}/${goarch}  构建戳: ${stamp}"; \
    GOOS="$goos" GOARCH="$goarch" \
      go build -trimpath -ldflags "-s -w -buildid= -X main.buildStamp=${stamp}" -o /out/nginx-mgr . ; \
    GOOS="$goos" GOARCH="$goarch" \
      go build -trimpath -ldflags "-s -w -buildid= -X main.buildStamp=${stamp}" -o /out/tokenctl ./cmd/tokenctl ; \
    case "$goarch" in \
      amd64) want=62 ;; \
      arm64) want=183 ;; \
      *) want="" ;; \
    esac; \
    if [ -n "$want" ]; then \
      got="$(od -An -t u2 -j 18 -N 2 /out/nginx-mgr | tr -d ' ')"; \
      if [ "$got" != "$want" ]; then \
        echo "!!! 架构校验失败: 期望 ${goarch}(e_machine=${want}) 实际 ${got}" >&2; \
        exit 1; \
      fi; \
      echo ">>> 架构校验通过: ${goarch}(e_machine=${want})"; \
    fi

# ---------- 2. 源码编译 nginx（目标架构，arm64 走 QEMU 模拟） ----------
FROM debian:bookworm-slim AS nginxbuilder
ARG NGINX_VERSION
ARG NGINX_SHA256
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      build-essential libpcre2-dev zlib1g-dev libssl-dev ca-certificates curl \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /build
RUN curl -fsSL -o nginx.tar.gz "https://nginx.org/download/nginx-${NGINX_VERSION}.tar.gz" \
 && echo "${NGINX_SHA256}  nginx.tar.gz" | sha256sum -c - \
 && tar -xzf nginx.tar.gz
WORKDIR /build/nginx-${NGINX_VERSION}
RUN ./configure \
      --prefix=/opt/nginx \
      --sbin-path=/opt/nginx/sbin/nginx \
      --conf-path=/opt/nginx/conf/nginx.conf \
      --pid-path=/run/nginx.pid \
      --lock-path=/run/nginx.lock \
      --http-log-path=/var/log/nginx/access.log \
      --error-log-path=/var/log/nginx/error.log \
      --http-client-body-temp-path=/var/cache/nginx/client_temp \
      --http-proxy-temp-path=/var/cache/nginx/proxy_temp \
      --http-fastcgi-temp-path=/var/cache/nginx/fastcgi_temp \
      --http-uwsgi-temp-path=/var/cache/nginx/uwsgi_temp \
      --http-scgi-temp-path=/var/cache/nginx/scgi_temp \
      --user=www-data \
      --group=www-data \
      --with-compat \
      --with-threads \
      --with-file-aio \
      --with-http_ssl_module \
      --with-http_v2_module \
      --with-http_realip_module \
      --with-http_sub_module \
      --with-http_gzip_static_module \
      --with-http_stub_status_module \
      --with-stream \
      --with-stream_ssl_module \
      --with-stream_realip_module \
      --with-stream_ssl_preread_module \
      --with-cc-opt="-O2 -pipe -fstack-protector-strong -D_FORTIFY_SOURCE=3 -fPIE" \
      --with-ld-opt="-Wl,-z,relro -Wl,-z,now -pie" \
 && make -j"$(nproc)" \
 && make install

# ---------- 3. 运行时 ----------
FROM debian:bookworm-slim AS runtime

LABEL org.opencontainers.image.title="ngx-nova" \
      org.opencontainers.image.description="Lightweight Nginx management panel with hardened nginx build" \
      org.opencontainers.image.source="https://github.com/Ansgwrt/ngx-nova"

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      libpcre2-8-0 zlib1g libssl3 ca-certificates curl tzdata \
 && rm -rf /var/lib/apt/lists/* \
 && mkdir -p /opt/nginx-mgr /var/log/nginx /var/cache/nginx /run /var/www/html \
 && chown -R www-data:www-data /var/www/html

COPY --from=nginxbuilder /opt/nginx /opt/nginx
COPY --from=appbuilder /out/nginx-mgr /usr/local/bin/nginx-mgr
COPY --from=appbuilder /out/tokenctl /usr/local/bin/tokenctl
COPY docker/nginx.conf /opt/nginx/conf/nginx.conf

RUN mkdir -p /opt/nginx/conf/sites-available /opt/nginx/conf/sites-enabled /opt/nginx/conf/conf.d \
 && ln -sf /opt/nginx/sbin/nginx /usr/sbin/nginx

WORKDIR /opt/nginx-mgr
ENV NGX_BIND=0.0.0.0:8083 \
    NGX_SBIN=/opt/nginx/sbin/nginx \
    NGX_CONF_DIR=/opt/nginx/conf \
    NGX_AUTH_FILE=/opt/nginx-mgr/auth_token.json \
    TZ=Asia/Shanghai

EXPOSE 8083 80 443

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -fsS http://127.0.0.1:8083/ui/ >/dev/null || exit 1

# 先拉起容器内 nginx，再以前台方式运行面板
CMD ["/bin/sh", "-c", "/opt/nginx/sbin/nginx && exec /usr/local/bin/nginx-mgr"]
