package main

import (
	"flag"
	"fmt"
	"log"
	"nginx-mgr/internal/service"
	"os"
	"path/filepath"
)

func usage() {
	fmt.Fprintf(flag.CommandLine.Output(), `Usage:
  tokenctl --set <token> [--file auth_token.json]

Options:
`)
	flag.PrintDefaults()
}

func defaultTokenPath() string {
	if home := os.Getenv("NGINX_MGR_HOME"); home != "" {
		return filepath.Join(home, "auth_token.json")
	}

	if _, err := os.Stat("auth_token.json"); err == nil {
		return "auth_token.json"
	}

	commonDirs := []string{
		"/opt/nginx-mgr",
		"/etc/nginx-mgr",
		"/var/lib/nginx-mgr",
	}
	for _, dir := range commonDirs {
		if info, err := os.Stat(dir); err == nil && info.IsDir() {
			return filepath.Join(dir, "auth_token.json")
		}
	}

	if wd, err := os.Getwd(); err == nil {
		return filepath.Join(wd, "auth_token.json")
	}
	return "auth_token.json"
}

func main() {
	var (
		token = flag.String("set", "", "要写入的登录令牌")
		path  = flag.String("file", defaultTokenPath(), "令牌存储文件路径")
	)
	flag.Usage = usage
	flag.Parse()

	if *token == "" {
		usage()
		os.Exit(1)
	}

	mgr, err := service.NewAuthManager(filepath.Clean(*path))
	if err != nil {
		log.Fatalf("加载令牌文件失败: %v", err)
	}

	expire, err := mgr.ResetToken(*token)
	if err != nil {
		log.Fatalf("设置令牌失败: %v", err)
	}

	fmt.Printf("登录令牌已更新，当前会话有效期至: %s\n", expire.Format("2006-01-02 15:04:05"))
}
