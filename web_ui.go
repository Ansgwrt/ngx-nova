package main

import (
	"crypto/sha256"
	"encoding/hex"
	"io/fs"
	"mime"
	"net/http"
	"path"
	"strconv"
	"strings"
)

// frontendAssets 是 index.html 里引用的本地资源，指纹会拼到 URL 上。
// 新增前端产物时记得同步这里，否则该文件不会带版本号（仍可靠 ETag 复验）。
var frontendAssets = []string{
	"app.css",
	"app.js",
	"app-render.js",
	"vendor/vue.runtime.global.prod.js",
}

// uiAssets 记录各静态资源的指纹（sha256 前 4 字节的十六进制）。
var uiAssets = map[string]string{}

// initUIAssets 在启动时算一次指纹，进程生命周期内不变。
func initUIAssets(sub fs.FS) {
	for _, name := range frontendAssets {
		data, err := fs.ReadFile(sub, name)
		if err != nil {
			continue
		}
		sum := sha256.Sum256(data)
		uiAssets[name] = hex.EncodeToString(sum[:4])
	}
}

// rewriteUIAssets 把 /ui/app.js 改写成 /ui/app.js?v=<指纹>。
// 只要前端内容变了，URL 就变，浏览器与 CDN 都不可能复用旧文件。
func rewriteUIAssets(html []byte) []byte {
	s := string(html)
	for name, ver := range uiAssets {
		s = strings.ReplaceAll(s, `"/ui/`+name+`"`, `"/ui/`+name+`?v=`+ver+`"`)
		s = strings.ReplaceAll(s, `'/ui/`+name+`'`, `'/ui/`+name+`?v=`+ver+`'`)
	}
	return []byte(s)
}

func uiContentType(name string) string {
	switch strings.ToLower(path.Ext(name)) {
	case ".html":
		return "text/html; charset=utf-8"
	case ".js":
		return "text/javascript; charset=utf-8"
	case ".css":
		return "text/css; charset=utf-8"
	case ".json":
		return "application/json; charset=utf-8"
	case ".svg":
		return "image/svg+xml"
	case ".ico":
		return "image/x-icon"
	case ".png":
		return "image/png"
	case ".woff2":
		return "font/woff2"
	case ".woff":
		return "font/woff"
	case ".ttf":
		return "font/ttf"
	}
	if t := mime.TypeByExtension(path.Ext(name)); t != "" {
		return t
	}
	return "application/octet-stream"
}

// uiHandler 提供 /ui 下的静态资源：
//   - HTML 永远回源校验（no-cache），避免拿到旧壳子
//   - 带正确指纹的资源按 immutable 长缓存，命中后不再回源
//   - 一律带 ETag，未变更返回 304，回源成本很低
func uiHandler(sub fs.FS) func(http.ResponseWriter, *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		name := strings.TrimPrefix(r.URL.Path, "/ui")
		name = strings.TrimPrefix(name, "/")
		if name == "" {
			name = "index.html"
		}
		name = path.Clean(name)
		if strings.HasSuffix(name, "/") {
			name += "index.html"
		}

		data, err := fs.ReadFile(sub, name)
		if err != nil {
			w.Header().Set("Cache-Control", "no-store")
			http.NotFound(w, r)
			return
		}

		isHTML := strings.HasSuffix(strings.ToLower(name), ".html")
		if isHTML {
			data = rewriteUIAssets(data)
		}

		sum := sha256.Sum256(data)
		etag := `"` + hex.EncodeToString(sum[:8]) + `"`

		switch {
		case isHTML:
			w.Header().Set("Cache-Control", "no-cache, must-revalidate")
		case uiAssets[name] != "" && r.URL.Query().Get("v") == uiAssets[name]:
			// URL 里带的指纹与当前内容一致 → 可以放心长缓存
			w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		default:
			// 无指纹或指纹过期（例如手输地址、旧页面引用的老 URL）→ 必须回源
			w.Header().Set("Cache-Control", "no-cache, must-revalidate")
		}
		w.Header().Set("ETag", etag)

		if inm := r.Header.Get("If-None-Match"); inm != "" && strings.Contains(inm, etag) {
			w.WriteHeader(http.StatusNotModified)
			return
		}

		w.Header().Set("Content-Type", uiContentType(name))
		w.Header().Set("Content-Length", strconv.Itoa(len(data)))
		if r.Method == http.MethodHead {
			w.WriteHeader(http.StatusOK)
			return
		}
		_, _ = w.Write(data)
	}
}
