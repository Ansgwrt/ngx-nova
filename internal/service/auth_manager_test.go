package service

import (
	"path/filepath"
	"testing"
)

func TestAuthManagerSync(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "auth_token.json")

	mgr, err := NewAuthManager(path)
	if err != nil {
		t.Fatalf("new auth manager: %v", err)
	}

	_, created, err := mgr.Login("first")
	if err != nil || !created {
		t.Fatalf("login first: %v, created=%v", err, created)
	}

	// simulate CLI modifying token on disk in another process
	cli, err := NewAuthManager(path)
	if err != nil {
		t.Fatalf("new cli mgr: %v", err)
	}
	if _, err := cli.ResetToken("second"); err != nil {
		t.Fatalf("reset token: %v", err)
	}

	if err := mgr.Validate("second"); err != nil {
		t.Fatalf("validate new token: %v", err)
	}
	if err := mgr.Validate("first"); err == nil {
		t.Fatalf("old token should fail after reset")
	}
}
