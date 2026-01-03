package service

import (
	"encoding/json"
	"errors"
	"math"
	"nginx-mgr/internal/model"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

type NotificationService struct {
	path string
	mu   sync.Mutex
}

const notificationSettingsPath = "/root/notification_settings.json"

var ErrInvalidExpiryDateFormat = errors.New("服务器到期日期格式应为 YYYY-MM-DD")

func NewNotificationService() *NotificationService {
	return &NotificationService{
		path: notificationSettingsPath,
	}
}

func (s *NotificationService) defaultSettings() model.NotificationSettings {
	return model.NotificationSettings{
		TrafficThreshold:    80,
		ServerExpiryDate:    "",
		ExpiryNotifyDays:    7,
		ServerLabel:         "",
		MonthlyTrafficLimit: 0,
		DingTalk: model.DingTalkSettings{
			Enabled: false,
			Webhook: "",
			Secret:  "",
		},
		Telegram: model.TelegramSettings{
			Enabled:  false,
			BotToken: "",
			ChatID:   "",
		},
		LastUpdatedUnixTime: 0,
	}
}

func (s *NotificationService) sanitize(input model.NotificationSettings) (model.NotificationSettings, error) {
	output := s.defaultSettings()

	threshold := input.TrafficThreshold
	if threshold < 0 {
		threshold = 0
	}
	if threshold > 100 {
		threshold = 100
	}
	output.TrafficThreshold = threshold

	date := strings.TrimSpace(input.ServerExpiryDate)
	if date != "" {
		if _, err := time.Parse("2006-01-02", date); err != nil {
			return model.NotificationSettings{}, ErrInvalidExpiryDateFormat
		}
		output.ServerExpiryDate = date
	}

	if input.ExpiryNotifyDays < 0 {
		output.ExpiryNotifyDays = 0
	} else {
		output.ExpiryNotifyDays = input.ExpiryNotifyDays
	}

	output.DingTalk.Enabled = input.DingTalk.Enabled
	output.DingTalk.Webhook = strings.TrimSpace(input.DingTalk.Webhook)
	output.DingTalk.Secret = strings.TrimSpace(input.DingTalk.Secret)

	output.Telegram.Enabled = input.Telegram.Enabled
	output.Telegram.BotToken = strings.TrimSpace(input.Telegram.BotToken)
	output.Telegram.ChatID = strings.TrimSpace(input.Telegram.ChatID)

	output.ServerLabel = strings.TrimSpace(input.ServerLabel)
	if math.IsNaN(input.MonthlyTrafficLimit) || input.MonthlyTrafficLimit < 0 {
		output.MonthlyTrafficLimit = 0
	} else {
		output.MonthlyTrafficLimit = math.Round(input.MonthlyTrafficLimit*100) / 100
	}

	return output, nil
}

func (s *NotificationService) ensureDir() error {
	dir := filepath.Dir(s.path)
	if dir == "." || dir == "/" {
		return nil
	}
	return os.MkdirAll(dir, 0700)
}

func (s *NotificationService) Get() (model.NotificationSettings, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	content, err := os.ReadFile(s.path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return s.defaultSettings(), nil
		}
		return model.NotificationSettings{}, err
	}

	var settings model.NotificationSettings
	if err := json.Unmarshal(content, &settings); err != nil {
		return model.NotificationSettings{}, err
	}

	normalized, err := s.sanitize(settings)
	if err != nil {
		// 如果已有数据格式不正确，返回默认值并忽略错误以避免界面无法展示
		return s.defaultSettings(), nil
	}
	normalized.LastUpdatedUnixTime = settings.LastUpdatedUnixTime

	return normalized, nil
}

func (s *NotificationService) Save(input model.NotificationSettings) (model.NotificationSettings, error) {
	settings, err := s.sanitize(input)
	if err != nil {
		return model.NotificationSettings{}, err
	}
	settings.LastUpdatedUnixTime = time.Now().Unix()

	data, err := json.MarshalIndent(settings, "", "  ")
	if err != nil {
		return model.NotificationSettings{}, err
	}

	if err := s.ensureDir(); err != nil {
		return model.NotificationSettings{}, err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if err := os.WriteFile(s.path, data, 0600); err != nil {
		return model.NotificationSettings{}, err
	}

	return settings, nil
}
