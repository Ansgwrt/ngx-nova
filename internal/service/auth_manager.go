package service

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"sync"
	"time"
)

var (
	ErrTokenNotSet   = errors.New("登录令牌未设置")
	ErrTokenExpired  = errors.New("登录已过期，请重新登录")
	ErrTokenMismatch = errors.New("登录令牌不正确")
)

const tokenTTL = 24 * time.Hour

type authState struct {
	TokenHash string    `json:"token_hash"`
	ExpiresAt time.Time `json:"expires_at"`
}

type AuthManager struct {
	path      string
	tokenHash string
	expiresAt time.Time
	mu        sync.RWMutex
}

func NewAuthManager(path string) (*AuthManager, error) {
	absPath, err := filepath.Abs(path)
	if err != nil {
		return nil, err
	}
	mgr := &AuthManager{path: absPath}
	if err := mgr.refreshFromDisk(); err != nil {
		return nil, err
	}
	return mgr, nil
}

func (m *AuthManager) saveLocked() error {
	state := authState{
		TokenHash: m.tokenHash,
		ExpiresAt: m.expiresAt,
	}
	data, err := json.MarshalIndent(state, "", "  ")
	if err != nil {
		return err
	}
	dir := filepath.Dir(m.path)
	if dir != "." {
		if err := os.MkdirAll(dir, 0700); err != nil {
			return err
		}
	}
	return os.WriteFile(m.path, data, 0600)
}

func (m *AuthManager) refreshFromDisk() error {
	content, err := os.ReadFile(m.path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			m.mu.Lock()
			m.tokenHash = ""
			m.expiresAt = time.Time{}
			m.mu.Unlock()
			return nil
		}
		return err
	}

	var state authState
	if err := json.Unmarshal(content, &state); err != nil {
		return err
	}

	m.mu.Lock()
	m.tokenHash = state.TokenHash
	m.expiresAt = state.ExpiresAt
	m.mu.Unlock()

	return nil
}

func (m *AuthManager) hash(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func (m *AuthManager) IsSet() bool {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.tokenHash != ""
}

func (m *AuthManager) ExpiresAt() time.Time {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.expiresAt
}

// Login will create the token if it's not set. If a token already exists, it must match.
// On success the session expiry is refreshed.
func (m *AuthManager) Login(token string) (time.Time, bool, error) {
	if err := m.refreshFromDisk(); err != nil {
		return time.Time{}, false, err
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	now := time.Now()
	targetHash := m.hash(token)

	created := false
	if m.tokenHash == "" {
		m.tokenHash = targetHash
		created = true
	} else if targetHash != m.tokenHash {
		return time.Time{}, false, ErrTokenMismatch
	}

	m.expiresAt = now.Add(tokenTTL)
	if err := m.saveLocked(); err != nil {
		return time.Time{}, false, err
	}
	return m.expiresAt, created, nil
}

// ResetToken forcibly replaces the stored token hash. Intended for terminal tooling.
func (m *AuthManager) ResetToken(token string) (time.Time, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.tokenHash = m.hash(token)
	m.expiresAt = time.Now().Add(tokenTTL)
	if err := m.saveLocked(); err != nil {
		return time.Time{}, err
	}
	return m.expiresAt, nil
}

func (m *AuthManager) Validate(token string) error {
	if err := m.refreshFromDisk(); err != nil {
		return err
	}

	m.mu.RLock()
	defer m.mu.RUnlock()

	if m.tokenHash == "" {
		return ErrTokenNotSet
	}

	if time.Now().After(m.expiresAt) {
		return ErrTokenExpired
	}

	if m.hash(token) != m.tokenHash {
		return ErrTokenMismatch
	}
	return nil
}
