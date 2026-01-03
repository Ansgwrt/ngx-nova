package service

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"nginx-mgr/internal/model"
)

const (
	defaultNotificationInterval = time.Minute
	trafficCooldown             = 10 * time.Minute
	expiryCooldown              = 12 * time.Hour
)

type NotificationDispatcher struct {
	svc        *NotificationService
	trafficMgr *TrafficUsageManager
	client     *http.Client

	mu               sync.Mutex
	lastSnapshot     *trafficSnapshot
	lastTrafficAlert time.Time
	lastExpiryKey    string
	lastExpiryAlert  time.Time
}

type trafficSnapshot struct {
	Timestamp   time.Time
	TotalBytes  uint64
	CapacityBps float64
}

func NewNotificationDispatcher(notificationSvc *NotificationService, trafficMgr *TrafficUsageManager) *NotificationDispatcher {
	if notificationSvc == nil {
		panic("notification service is required")
	}
	if trafficMgr == nil {
		trafficMgr = NewTrafficUsageManager("")
	}
	return &NotificationDispatcher{
		svc:        notificationSvc,
		trafficMgr: trafficMgr,
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func (d *NotificationDispatcher) Start(ctx context.Context) {
	if ctx == nil {
		ctx = context.Background()
	}
	ticker := time.NewTicker(defaultNotificationInterval)
	defer ticker.Stop()

	d.runCycle()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			d.runCycle()
		}
	}
}

func (d *NotificationDispatcher) runCycle() {
	settings, err := d.svc.Get()
	if err != nil {
		log.Printf("[notification] 获取配置失败: %v", err)
		return
	}

	if !settings.DingTalk.Enabled && !settings.Telegram.Enabled {
		return
	}

	d.checkTraffic(settings)
	d.checkExpiry(settings)
}

func (d *NotificationDispatcher) checkTraffic(settings model.NotificationSettings) {
	if settings.TrafficThreshold <= 0 {
		d.mu.Lock()
		d.lastSnapshot = nil
		d.mu.Unlock()
		return
	}

	current, err := readTrafficSnapshot()
	if err != nil {
		log.Printf("[notification] 读取网络流量失败: %v", err)
		return
	}
	if current == nil {
		return
	}

	var cycle TrafficCycle
	if d.trafficMgr != nil {
		if snapshot, err := d.trafficMgr.Snapshot(settings, current.TotalBytes); err == nil {
			cycle = snapshot
		} else {
			log.Printf("[notification] 统计周期流量失败: %v", err)
		}
	}

	d.mu.Lock()
	defer d.mu.Unlock()

	if d.lastSnapshot == nil {
		d.lastSnapshot = current
		return
	}

	elapsed := current.Timestamp.Sub(d.lastSnapshot.Timestamp).Seconds()
	if elapsed <= 0 {
		d.lastSnapshot = current
		return
	}

	if current.TotalBytes <= d.lastSnapshot.TotalBytes {
		d.lastSnapshot = current
		return
	}

	delta := float64(current.TotalBytes - d.lastSnapshot.TotalBytes)
	usageBps := delta / elapsed

	capacity := current.CapacityBps
	if capacity <= 0 {
		d.lastSnapshot = current
		return
	}

	usagePercent := usageBps / capacity * 100
	if usagePercent < float64(settings.TrafficThreshold) {
		d.lastSnapshot = current
		return
	}

	if time.Since(d.lastTrafficAlert) < trafficCooldown {
		d.lastSnapshot = current
		return
	}

	now := time.Now()
	serverName := strings.TrimSpace(settings.ServerLabel)
	if serverName == "" {
		serverName = "本机服务器"
	}

	title := fmt.Sprintf("流量告警 · %s", serverName)
	contentLines := []string{
		"## 🚨 流量告警",
		"",
		fmt.Sprintf("* **服务名称**: %s", serverName),
		fmt.Sprintf("* **监测时间**: %s", now.Format("2006-01-02 15:04:05")),
		fmt.Sprintf("* **平均带宽**: %s/s（近 %.0f 秒）", formatBytes(usageBps), elapsed),
		fmt.Sprintf("* **阈值设定**: %d%%", settings.TrafficThreshold),
		fmt.Sprintf("* **当前利用率**: %.1f%%", usagePercent),
	}

	if cycle.UsedBytes > 0 || cycle.LimitBytes > 0 {
		usageLine := fmt.Sprintf("* **当前周期用量**: %s", formatBytes(float64(cycle.UsedBytes)))
		if cycle.LimitBytes > 0 {
			usageLine += fmt.Sprintf(" / %s", formatBytes(float64(cycle.LimitBytes)))
		}
		contentLines = append(contentLines, usageLine)
	}
	if !cycle.NextReset.IsZero() {
		contentLines = append(contentLines, fmt.Sprintf("* **下次流量重置**: %s", cycle.NextReset.Format("2006-01-02")))
	}
	if !cycle.CycleStart.IsZero() {
		contentLines = append(contentLines, fmt.Sprintf("* **统计起始**: %s", cycle.CycleStart.Format("2006-01-02")))
	}

	contentLines = append(contentLines, "", "> 建议：请排查高流量应用或调整提醒阈值。")

	content := strings.Join(contentLines, "\n")

	d.dispatch(settings, title, content)
	d.lastTrafficAlert = now
	d.lastSnapshot = current
}

func (d *NotificationDispatcher) checkExpiry(settings model.NotificationSettings) {
	expiryStr := strings.TrimSpace(settings.ServerExpiryDate)
	if expiryStr == "" || settings.ExpiryNotifyDays <= 0 {
		return
	}

	expiry, err := time.Parse("2006-01-02", expiryStr)
	if err != nil {
		log.Printf("[notification] 服务器到期日期解析失败: %v", err)
		return
	}

	now := time.Now()
	remaining := expiry.Sub(now)
	daysLeft := int(math.Ceil(remaining.Hours() / 24))

	var shouldSend bool
	var title, content, key string

	serverName := strings.TrimSpace(settings.ServerLabel)
	if serverName == "" {
		serverName = "本机服务器"
	}

	switch {
	case remaining <= 0:
		key = expiryStr + "|expired"
		title = fmt.Sprintf("续费提醒 · %s", serverName)
		daysOver := int(math.Ceil(math.Abs(remaining.Hours()) / 24))
		if daysOver < 1 {
			daysOver = 1
		}
		content = fmt.Sprintf(
			"## 🔔 续费提醒\n\n* **服务名称**: %s\n* **到期日期**: %s（已逾期 %d 天）\n* **提醒设定**: 提前 %d 天\n* **操作建议**: 请立即续费或处理",
			serverName,
			expiryStr,
			daysOver,
			settings.ExpiryNotifyDays,
		)
		shouldSend = true
	case daysLeft <= settings.ExpiryNotifyDays:
		key = fmt.Sprintf("%s|%d", expiryStr, daysLeft)
		title = fmt.Sprintf("续费提醒 · %s", serverName)
		if daysLeft < 0 {
			daysLeft = 0
		}
		content = fmt.Sprintf(
			"## 🔔 续费提醒\n\n* **服务名称**: %s\n* **到期日期**: %s（还有 %d 天）\n* **提醒设定**: 提前 %d 天\n* **操作建议**: 请安排续费",
			serverName,
			expiryStr,
			daysLeft,
			settings.ExpiryNotifyDays,
		)
		shouldSend = true
	}

	if !shouldSend {
		return
	}

	d.mu.Lock()
	defer d.mu.Unlock()

	if d.lastExpiryKey == key && time.Since(d.lastExpiryAlert) < expiryCooldown {
		return
	}

	d.dispatch(settings, title, content)
	d.lastExpiryKey = key
	d.lastExpiryAlert = time.Now()
}

func (d *NotificationDispatcher) dispatch(settings model.NotificationSettings, title, content string) {
	if settings.DingTalk.Enabled && settings.DingTalk.Webhook != "" {
		if err := d.sendDingTalk(settings.DingTalk, title, content); err != nil {
			log.Printf("[notification] 钉钉通知失败: %v", err)
		}
	}

	if settings.Telegram.Enabled && settings.Telegram.BotToken != "" && settings.Telegram.ChatID != "" {
		if err := d.sendTelegram(settings.Telegram, title, content); err != nil {
			log.Printf("[notification] Telegram 通知失败: %v", err)
		}
	}
}

func (d *NotificationDispatcher) sendDingTalk(cfg model.DingTalkSettings, title, content string) error {
	webhook := strings.TrimSpace(cfg.Webhook)
	if webhook == "" {
		return errors.New("钉钉 Webhook 未配置")
	}

	urlWithSign, err := buildDingTalkURL(webhook, cfg.Secret)
	if err != nil {
		return err
	}

	payload := map[string]interface{}{
		"msgtype": "markdown",
		"markdown": map[string]string{
			"title": title,
			"text":  content,
		},
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequest("POST", urlWithSign, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := d.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return fmt.Errorf("钉钉返回状态码: %d", resp.StatusCode)
	}
	return nil
}

func (d *NotificationDispatcher) sendTelegram(cfg model.TelegramSettings, title, content string) error {
	botToken := strings.TrimSpace(cfg.BotToken)
	if botToken == "" {
		return errors.New("Telegram Bot Token 未配置")
	}
	chatID := strings.TrimSpace(cfg.ChatID)
	if chatID == "" {
		return errors.New("Telegram Chat ID 未配置")
	}

	apiURL := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", botToken)
	text := buildPlainText(title, content)
	values := url.Values{}
	values.Set("chat_id", chatID)
	values.Set("text", text)

	req, err := http.NewRequest("POST", apiURL, strings.NewReader(values.Encode()))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := d.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return fmt.Errorf("Telegram 返回状态码: %d", resp.StatusCode)
	}
	return nil
}

func buildPlainText(title, content string) string {
	lines := []string{title, ""}
	for _, line := range strings.Split(content, "\n") {
		line = strings.TrimSpace(line)
		line = strings.TrimPrefix(line, "### ")
		line = strings.TrimPrefix(line, "- ")
		line = strings.TrimPrefix(line, "> ")
		line = strings.ReplaceAll(line, "**", "")
		if line != "" {
			lines = append(lines, line)
		}
	}
	return strings.Join(lines, "\n")
}

func buildDingTalkURL(rawURL, secret string) (string, error) {
	if strings.TrimSpace(secret) == "" {
		return rawURL, nil
	}

	parsed, err := url.Parse(rawURL)
	if err != nil {
		return "", err
	}

	timestamp := time.Now().UnixNano() / 1e6
	stringToSign := fmt.Sprintf("%d\n%s", timestamp, secret)
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(stringToSign))
	sign := base64.StdEncoding.EncodeToString(h.Sum(nil))

	query := parsed.Query()
	query.Set("timestamp", strconv.FormatInt(timestamp, 10))
	query.Set("sign", sign)
	parsed.RawQuery = query.Encode()
	return parsed.String(), nil
}

func readTrafficSnapshot() (*trafficSnapshot, error) {
	statsDir := "/sys/class/net"
	entries, err := os.ReadDir(statsDir)
	if err != nil {
		return nil, err
	}

	var total uint64
	var capacity float64
	for _, entry := range entries {
		name := entry.Name()
		if name == "lo" {
			continue
		}
		base := filepath.Join(statsDir, name)
		rxPath := filepath.Join(base, "statistics", "rx_bytes")
		txPath := filepath.Join(base, "statistics", "tx_bytes")

		rx, err := readUintFromFile(rxPath)
		if err != nil {
			continue
		}
		tx, err := readUintFromFile(txPath)
		if err != nil {
			continue
		}
		total += rx + tx

		if speed, err := readIntFromFile(filepath.Join(base, "speed")); err == nil && speed > 0 {
			capacity += float64(speed) * 125000 // Mbps to Bps
		}
	}

	return &trafficSnapshot{
		Timestamp:   time.Now(),
		TotalBytes:  total,
		CapacityBps: capacity,
	}, nil
}

func readUintFromFile(path string) (uint64, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return 0, err
	}
	return strconv.ParseUint(strings.TrimSpace(string(data)), 10, 64)
}

func readIntFromFile(path string) (int64, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return 0, err
	}
	return strconv.ParseInt(strings.TrimSpace(string(data)), 10, 64)
}

func formatBytes(value float64) string {
	if value <= 0 {
		return "0 B"
	}
	units := []string{"B", "KB", "MB", "GB", "TB", "PB"}
	idx := 0
	for value >= 1024 && idx < len(units)-1 {
		value /= 1024
		idx++
	}
	switch {
	case value >= 100:
		return fmt.Sprintf("%.0f %s", value, units[idx])
	case value >= 10:
		return fmt.Sprintf("%.1f %s", value, units[idx])
	default:
		return fmt.Sprintf("%.2f %s", value, units[idx])
	}
}
