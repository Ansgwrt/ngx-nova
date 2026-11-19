# ngx-nova 构建入口
#
#   make build            当前平台二进制（开发用）
#   make dist             交叉编译 linux/amd64 + linux/arm64 并打包
#   make docker           多架构镜像（buildx，需先 docker login）
#   make test / vet       单测与静态检查
#   make advisories       从 nginx.org 重新生成漏洞库后需重新编译

APP        := nginx-mgr
VERSION    ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo dev)
DOCKER_REPO ?= answgrt/ngx-nova
LDFLAGS    := -s -w -buildid=
GOFLAGS    := -trimpath
PLATFORMS  := linux/amd64 linux/arm64

.PHONY: all build dist vet test tidy clean advisories docker docker-load

all: build

build:
	CGO_ENABLED=0 go build $(GOFLAGS) -ldflags "$(LDFLAGS)" -o bin/$(APP) .
	CGO_ENABLED=0 go build $(GOFLAGS) -ldflags "$(LDFLAGS)" -o bin/tokenctl ./cmd/tokenctl

dist:
	@mkdir -p dist
	@for p in $(PLATFORMS); do \
		os=$${p%/*}; arch=$${p#*/}; \
		echo ">>> $$os/$$arch"; \
		CGO_ENABLED=0 GOOS=$$os GOARCH=$$arch go build $(GOFLAGS) -ldflags "$(LDFLAGS)" -o dist/$(APP)-$$os-$$arch . || exit 1; \
		CGO_ENABLED=0 GOOS=$$os GOARCH=$$arch go build $(GOFLAGS) -ldflags "$(LDFLAGS)" -o dist/tokenctl-$$os-$$arch ./cmd/tokenctl || exit 1; \
		tar -czf dist/$(APP)-$$os-$$arch.tar.gz -C dist $(APP)-$$os-$$arch tokenctl-$$os-$$arch; \
	done
	@ls -lh dist/*.tar.gz

vet:
	go vet ./...

test:
	go test ./... -count=1

tidy:
	go mod tidy

advisories:
	python3 scripts/gen_advisories.py

docker:
	docker buildx build --platform linux/amd64,linux/arm64 \
		-t $(DOCKER_REPO):$(VERSION) -t $(DOCKER_REPO):latest --push .

docker-load:
	docker buildx build --platform linux/amd64,linux/arm64 \
		-t $(DOCKER_REPO):$(VERSION) --load .

clean:
	rm -rf bin dist
