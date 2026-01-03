package model

type DingTalkSettings struct {
	Enabled bool   `json:"enabled"`
	Webhook string `json:"webhook"`
	Secret  string `json:"secret"`
}

type TelegramSettings struct {
	Enabled  bool   `json:"enabled"`
	BotToken string `json:"bot_token"`
	ChatID   string `json:"chat_id"`
}

type NotificationSettings struct {
	TrafficThreshold    int              `json:"traffic_threshold"`
	ServerExpiryDate    string           `json:"server_expiry_date"`
	ExpiryNotifyDays    int              `json:"expiry_notify_days"`
	DingTalk            DingTalkSettings `json:"dingtalk"`
	Telegram            TelegramSettings `json:"telegram"`
	ServerLabel         string           `json:"server_label"`
	MonthlyTrafficLimit float64          `json:"traffic_monthly_limit_gb"`
	LastUpdatedUnixTime int64            `json:"last_updated_unix_time"`
}

type NetworkTraffic struct {
	RXBytes    uint64 `json:"rx_bytes"`
	TXBytes    uint64 `json:"tx_bytes"`
	TotalBytes uint64 `json:"total_bytes"`
	CycleUsedBytes  uint64 `json:"cycle_used_bytes"`
	CycleLimitBytes uint64 `json:"cycle_limit_bytes"`
	CycleNextReset  string `json:"cycle_next_reset"`
	CycleStart      string `json:"cycle_start"`
}
