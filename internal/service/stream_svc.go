package service

import (
	"fmt"
	"nginx-mgr/internal/model"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"text/template"
)

type StreamService struct {
	ConfDir string
}

func NewStreamService() *StreamService {
	return &StreamService{
		ConfDir: model.NginxConfDir,
	}
}

func (s *StreamService) CreateStream(config model.StreamConfig) error {
	tmpl, err := template.ParseFS(templateFS, "templates/stream.tmpl")
	if err != nil {
		return err
	}

	availablePath := s.availablePath(config.Name)
	f, err := os.Create(availablePath)
	if err != nil {
		return err
	}
	defer f.Close()

	if err := tmpl.Execute(f, config); err != nil {
		return err
	}

	enabledPath := s.enabledPath(config.Name)
	os.Remove(enabledPath)
	return os.Symlink(availablePath, enabledPath)
}

func (s *StreamService) DeleteStream(name string) error {
	enabledPath := s.enabledPath(name)
	availablePath := s.availablePath(name)

	os.Remove(enabledPath)
	return os.Remove(availablePath)
}

func (s *StreamService) ListStreams() ([]string, error) {
	files, err := os.ReadDir(filepath.Join(s.ConfDir, "streams-available"))
	if err != nil {
		return nil, err
	}
	var streams []string
	for _, f := range files {
		streams = append(streams, f.Name())
	}
	return streams, nil
}

func (s *StreamService) GetStream(name string) (*model.StreamConfig, error) {
	content, err := os.ReadFile(s.availablePath(name))
	if err != nil {
		return nil, err
	}
	cfg := &model.StreamConfig{Name: name}
	lines := strings.Split(string(content), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		switch {
		case strings.HasPrefix(line, "listen "):
			value := strings.TrimSuffix(strings.TrimPrefix(line, "listen "), ";")
			port, err := strconv.Atoi(value)
			if err != nil {
				return nil, fmt.Errorf("解析端口失败: %w", err)
			}
			cfg.ListenPort = port
		case strings.HasPrefix(line, "server ") && strings.HasSuffix(line, ";"):
			value := strings.TrimSuffix(strings.TrimPrefix(line, "server "), ";")
			cfg.Target = value
		}
	}
	return cfg, nil
}

func (s *StreamService) ListStreamConfigs() ([]model.StreamConfig, error) {
	names, err := s.ListStreams()
	if err != nil {
		return nil, err
	}
	configs := make([]model.StreamConfig, 0, len(names))
	for _, name := range names {
		cfg, err := s.GetStream(name)
		if err != nil {
			return nil, err
		}
		configs = append(configs, *cfg)
	}
	return configs, nil
}

func (s *StreamService) availablePath(name string) string {
	return filepath.Join(s.ConfDir, "streams-available", name)
}

func (s *StreamService) enabledPath(name string) string {
	return filepath.Join(s.ConfDir, "streams-enabled", name)
}

func (s *StreamService) ReadStreamRaw(name string) (string, error) {
	content, err := os.ReadFile(s.availablePath(name))
	if err != nil {
		return "", err
	}
	return string(content), nil
}

func (s *StreamService) WriteStreamRaw(name, content string) error {
	path := s.availablePath(name)
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return err
	}
	if err := os.WriteFile(path, []byte(content), 0644); err != nil {
		return err
	}
	enabled := s.enabledPath(name)
	if info, err := os.Lstat(enabled); err == nil {
		if info.Mode()&os.ModeSymlink == 0 {
			os.Remove(enabled)
			return os.Symlink(path, enabled)
		}
		return nil
	} else if os.IsNotExist(err) {
		return os.Symlink(path, enabled)
	} else {
		return err
	}
}
