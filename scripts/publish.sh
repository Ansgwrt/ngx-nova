#!/usr/bin/env bash
# ngx-nova 发布脚本：推送代码、打 tag、创建 Release、推送多架构镜像
#
# 用法：
#   ./scripts/publish.sh github v1.0.0      # 推 main + 打 tag + 建 Release（需 gh CLI 已登录）
#   ./scripts/publish.sh docker 1.30.7      # 推送 amd64/arm64 镜像到 Docker Hub
#   ./scripts/publish.sh all    v1.0.0      # 依次执行（镜像 tag 取版本号去掉 v）
#
# 凭据只从环境变量读取，不落盘、不进 git 历史：
#   GitHub : gh auth login   （或 export GH_TOKEN=...）
#   Docker : export DOCKER_USER=... DOCKER_TOKEN=...   ← 用 Access Token，不要用密码
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

DOCKER_IMAGE="${DOCKER_IMAGE:-ansgwrt/ngx-nova}"
PLATFORMS="linux/amd64,linux/arm64"

log() { printf '\n\033[1;36m>>> %s\033[0m\n' "$*"; }
die() { printf '\033[1;31m!!! %s\033[0m\n' "$*" >&2; exit 1; }

need() { command -v "$1" >/dev/null 2>&1 || die "缺少命令：$1"; }

build_artifacts() {
  log "交叉编译 linux/amd64 与 linux/arm64"
  mkdir -p dist
  for arch in amd64 arm64; do
    CGO_ENABLED=0 GOOS=linux GOARCH="$arch" go build -trimpath -ldflags "-s -w -buildid=" \
      -o "dist/nginx-mgr-linux-$arch" .
    CGO_ENABLED=0 GOOS=linux GOARCH="$arch" go build -trimpath -ldflags "-s -w -buildid=" \
      -o "dist/tokenctl-linux-$arch" ./cmd/tokenctl
    tar -czf "dist/nginx-mgr-linux-$arch.tar.gz" --owner=0 --group=0 --numeric-owner \
      -C dist "nginx-mgr-linux-$arch" "tokenctl-linux-$arch"
    rm -f "dist/nginx-mgr-linux-$arch" "dist/tokenctl-linux-$arch"
  done
  ( cd dist && sha256sum ./*.tar.gz > SHA256SUMS.txt )
  ls -lh dist
}

publish_github() {
  local tag="${1:?用法: publish.sh github <tag，例如 v1.0.0>}"
  need git
  need gh

  if ! gh auth status >/dev/null 2>&1; then
    die "gh 未登录。先运行：gh auth login（选 HTTPS + 浏览器登录，或用 GH_TOKEN 环境变量）"
  fi

  log "检查测试"
  go vet ./...
  go test ./... -count=1

  build_artifacts

  log "推送 main"
  git push origin HEAD:main

  if git rev-parse "$tag" >/dev/null 2>&1; then
    log "tag $tag 已存在，跳过创建"
  else
    log "创建 tag $tag"
    git tag -a "$tag" -m "ngx-nova $tag"
    git push origin "$tag"
  fi

  log "创建/更新 GitHub Release 并上传产物"
  gh release view "$tag" >/dev/null 2>&1 \
    || gh release create "$tag" --generate-notes --title "ngx-nova $tag"
  gh release upload "$tag" dist/*.tar.gz dist/SHA256SUMS.txt --clobber

  log "完成。Release 地址："
  gh release view "$tag" --json url -q .url
}

publish_docker() {
  local ver="${1:?用法: publish.sh docker <版本号，例如 1.30.7>}"
  need docker

  docker buildx version >/dev/null 2>&1 \
    || die "未安装 buildx。Docker Desktop 自带；Linux 需安装 docker-buildx-plugin"

  : "${DOCKER_USER:?请先 export DOCKER_USER=<Docker Hub 用户名>}"
  : "${DOCKER_TOKEN:?请先 export DOCKER_TOKEN=<Docker Hub Access Token，不要用登录密码>}"

  log "登录 Docker Hub（用户名 $DOCKER_USER）"
  printf '%s' "$DOCKER_TOKEN" | docker login -u "$DOCKER_USER" --password-stdin

  log "构建并推送 $PLATFORMS 镜像：$DOCKER_IMAGE:$ver / latest"
  docker buildx build \
    --platform "$PLATFORMS" \
    --build-arg NGINX_VERSION="${NGINX_VERSION:-1.30.7}" \
    -t "$DOCKER_IMAGE:$ver" \
    -t "$DOCKER_IMAGE:latest" \
    --push .

  log "镜像架构确认"
  docker buildx imagetools inspect "$DOCKER_IMAGE:$ver" | sed -n '1,40p'
}

case "${1:-}" in
  github) shift; publish_github "$@" ;;
  docker) shift; publish_docker "$@" ;;
  all)
    shift
    tag="${1:?用法: publish.sh all <tag>}"
    publish_github "$tag"
    publish_docker "${tag#v}"
    ;;
  *)
    sed -n '2,11p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
    exit 1
    ;;
esac
