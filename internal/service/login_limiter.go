package service

import (
	"sync"
	"time"
)

// LoginLimiter 是一个按键（通常是客户端 IP）计数的失败次数限制器。
// 目的：把在线爆破 8 位以上令牌的成本抬到不可行，而不是给面板加验证码之类的交互负担。
type LoginLimiter struct {
	mu          sync.Mutex
	entries     map[string]*loginAttempt
	maxFailures int
	window      time.Duration
	now         func() time.Time
}

type loginAttempt struct {
	failures int
	last     time.Time
}

// NewLoginLimiter 创建限制器：window 窗口内最多允许 maxFailures 次失败。
func NewLoginLimiter(maxFailures int, window time.Duration) *LoginLimiter {
	if maxFailures <= 0 {
		maxFailures = 5
	}
	if window <= 0 {
		window = 10 * time.Minute
	}
	return &LoginLimiter{
		entries:     make(map[string]*loginAttempt),
		maxFailures: maxFailures,
		window:      window,
		now:         time.Now,
	}
}

// Allow 判断当前 key 是否还能继续尝试；不能时返回需要等待的时长。
func (l *LoginLimiter) Allow(key string) (bool, time.Duration) {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := l.now()
	entry, ok := l.entries[key]
	if !ok {
		return true, 0
	}
	if now.Sub(entry.last) > l.window {
		delete(l.entries, key)
		return true, 0
	}
	if entry.failures >= l.maxFailures {
		return false, l.window - now.Sub(entry.last)
	}
	return true, 0
}

// Fail 记录一次失败。
func (l *LoginLimiter) Fail(key string) {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := l.now()
	entry, ok := l.entries[key]
	if !ok || now.Sub(entry.last) > l.window {
		l.entries[key] = &loginAttempt{failures: 1, last: now}
	} else {
		entry.failures++
		entry.last = now
	}

	// 简单防膨胀：条目过多时清掉已过窗口的记录。
	if len(l.entries) > 1024 {
		for k, v := range l.entries {
			if now.Sub(v.last) > l.window {
				delete(l.entries, k)
			}
		}
	}
}

// Reset 在登录成功后清除计数。
func (l *LoginLimiter) Reset(key string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.entries, key)
}
