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

const defaultTrafficStatePath = "/root/traffic_usage_state.json"

type TrafficUsageManager struct {
	path string
	mu   sync.Mutex
}

type trafficUsageState struct {
	BaselineBytes uint64 `json:"baseline_bytes"`
	CycleStart    int64  `json:"cycle_start_unix"`
	NextReset     int64  `json:"next_reset_unix"`
	ExpiryDate    string `json:"expiry_date"`
}

type TrafficCycle struct {
	UsedBytes  uint64
	LimitBytes uint64
	CycleStart time.Time
	NextReset  time.Time
}

func NewTrafficUsageManager(path string) *TrafficUsageManager {
	if path == "" {
		path = defaultTrafficStatePath
	}
	return &TrafficUsageManager{path: path}
}

func (m *TrafficUsageManager) Snapshot(settings model.NotificationSettings, totalBytes uint64) (TrafficCycle, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	state, err := m.loadState()
	if err != nil && !errors.Is(err, os.ErrNotExist) {
		return TrafficCycle{}, err
	}
	now := time.Now()

	// Ensure defaults.
	if state == nil {
		state = &trafficUsageState{
			BaselineBytes: totalBytes,
			CycleStart:    now.Unix(),
		}
	}

	if totalBytes < state.BaselineBytes {
		// Counter wrapped (e.g., system reboot). Reset baseline to current.
		state.BaselineBytes = totalBytes
		state.CycleStart = now.Unix()
		state.NextReset = 0
	}

	var nextReset time.Time

	if strings.TrimSpace(settings.ServerExpiryDate) == "" {
		state.ExpiryDate = ""
		state.NextReset = 0
		nextReset = time.Time{}
	} else {
		if state.ExpiryDate != settings.ServerExpiryDate {
			state.BaselineBytes = totalBytes
			state.CycleStart = now.Unix()
		}
		nextReset = computeNextReset(now, settings.ServerExpiryDate)
		if nextReset.IsZero() {
			state.NextReset = 0
		} else {
			// If current next reset passed or differs from expected, update.
			if state.NextReset == 0 || now.Unix() >= state.NextReset || absDuration(nextReset.Unix()-state.NextReset) > int64(12*time.Hour/time.Second) {
				state.BaselineBytes = totalBytes
				state.CycleStart = now.Unix()
				state.NextReset = nextReset.Unix()
			} else {
				nextReset = time.Unix(state.NextReset, 0)
				if now.Unix() >= state.NextReset {
					state.BaselineBytes = totalBytes
					state.CycleStart = now.Unix()
					nextReset = computeNextReset(now.Add(time.Second), settings.ServerExpiryDate)
					state.NextReset = nextReset.Unix()
				}
			}
		}
		state.ExpiryDate = settings.ServerExpiryDate
	}

	used := totalBytes - state.BaselineBytes

	if err := m.saveState(state); err != nil {
		return TrafficCycle{}, err
	}

	limitBytes := uint64(0)
	if settings.MonthlyTrafficLimit > 0 {
		limitBytes = uint64(math.Round(settings.MonthlyTrafficLimit * float64(1<<30)))
	}

	return TrafficCycle{
		UsedBytes:  used,
		LimitBytes: limitBytes,
		CycleStart: time.Unix(state.CycleStart, 0),
		NextReset:  nextReset,
	}, nil
}

func (m *TrafficUsageManager) loadState() (*trafficUsageState, error) {
	data, err := os.ReadFile(m.path)
	if err != nil {
		return nil, err
	}
	var state trafficUsageState
	if err := json.Unmarshal(data, &state); err != nil {
		return nil, err
	}
	return &state, nil
}

func (m *TrafficUsageManager) saveState(state *trafficUsageState) error {
	if err := os.MkdirAll(filepath.Dir(m.path), 0700); err != nil {
		return err
	}
	data, err := json.MarshalIndent(state, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(m.path, data, 0600)
}

func computeNextReset(now time.Time, expiry string) time.Time {
	expiry = strings.TrimSpace(expiry)
	if expiry == "" {
		return time.Time{}
	}
	t, err := time.ParseInLocation("2006-01-02", expiry, now.Location())
	if err != nil {
		return time.Time{}
	}
	// Move to the next occurrence in the future.
	for !t.After(now) {
		t = t.AddDate(0, 1, 0)
	}
	// Use end of day for reset moment.
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, t.Location())
}

func absDuration(v int64) int64 {
	if v < 0 {
		return -v
	}
	return v
}
