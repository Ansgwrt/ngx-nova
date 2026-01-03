package service

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type SiteLogEntry struct {
	Domain     string   `json:"domain"`
	AccessLogs []string `json:"access,omitempty"`
	ErrorLogs  []string `json:"error,omitempty"`
}

func (s *SiteService) ListEnabledSites() ([]string, error) {
	dir := filepath.Join(s.ConfDir, "sites-enabled")
	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return []string{}, nil
		}
		return nil, err
	}
	var domains []string
	for _, entry := range entries {
		if entry.Name() == "" {
			continue
		}
		domains = append(domains, entry.Name())
	}
	return domains, nil
}

func (s *SiteService) CollectTodayLogs(maxLines int) ([]SiteLogEntry, error) {
	if maxLines <= 0 {
		maxLines = 200
	}
	domains, err := s.ListEnabledSites()
	if err != nil {
		return nil, err
	}
	results := make([]SiteLogEntry, 0, len(domains))
	if len(domains) == 0 {
		return results, nil
	}

	token := time.Now().Format("02/Jan/2006")
	for _, domain := range domains {
		entry := SiteLogEntry{Domain: domain}

		accessPath := filepath.Join("/var/log/nginx", fmt.Sprintf("%s-access.log", domain))
		if lines, readErr := readTodayLogLines(accessPath, token, maxLines); readErr == nil {
			entry.AccessLogs = lines
		}

		errorPath := filepath.Join("/var/log/nginx", fmt.Sprintf("%s-error.log", domain))
		if lines, readErr := readTodayLogLines(errorPath, token, maxLines); readErr == nil {
			entry.ErrorLogs = lines
		}

		results = append(results, entry)
	}

	return results, nil
}

func readTodayLogLines(path, token string, maxLines int) ([]string, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	info, err := file.Stat()
	if err != nil {
		return nil, err
	}

	const window int64 = 256 * 1024
	start := int64(0)
	if info.Size() > window {
		start = info.Size() - window
	}
	if _, err := file.Seek(start, io.SeekStart); err != nil {
		return nil, err
	}

	data, err := io.ReadAll(file)
	if err != nil {
		return nil, err
	}

	lines := strings.Split(string(data), "\n")
	if start > 0 && len(lines) > 0 {
		lines = lines[1:]
	}

	filtered := make([]string, 0, len(lines))
	for _, line := range lines {
		trim := strings.TrimSpace(line)
		if trim == "" {
			continue
		}
		if strings.Contains(line, token) {
			filtered = append(filtered, trim)
		}
	}

	if len(filtered) > maxLines {
		filtered = filtered[len(filtered)-maxLines:]
	}

	return filtered, nil
}
