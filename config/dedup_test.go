package config

import (
	"path/filepath"
	"testing"
)

// TestAddAccountDeduplicatesByUserId verifies that re-importing an account with
// the same server-assigned UserId refreshes the existing record in place
// instead of creating a duplicate, while preserving its ID and stats.
func TestAddAccountDeduplicatesByUserId(t *testing.T) {
	if err := Init(filepath.Join(t.TempDir(), "config.json")); err != nil {
		t.Fatalf("init config: %v", err)
	}

	first := Account{
		ID:           "id-1",
		Email:        "user@example.com",
		UserId:       "kiro-user-1",
		AuthMethod:   "social",
		AccessToken:  "token-old",
		Enabled:      true,
		RequestCount: 5,
		MachineId:    "machine-1",
	}
	if err := AddAccount(first); err != nil {
		t.Fatalf("add first: %v", err)
	}

	// Re-import same UserId with a new account ID, fresh token, and a different
	// email/authMethod (e.g. switched login provider) — same underlying user.
	second := Account{
		ID:          "id-2",
		Email:       "user-renamed@example.com",
		UserId:      "kiro-user-1",
		AuthMethod:  "idc",
		AccessToken: "token-new",
		Enabled:     true,
	}
	if err := AddAccount(second); err != nil {
		t.Fatalf("add second: %v", err)
	}

	accounts := GetAccounts()
	if len(accounts) != 1 {
		t.Fatalf("expected 1 account after dedup, got %d", len(accounts))
	}
	if accounts[0].ID != "id-1" {
		t.Fatalf("dedup should preserve existing ID id-1, got %q", accounts[0].ID)
	}
	if accounts[0].AccessToken != "token-new" {
		t.Fatalf("expected token refreshed to token-new, got %q", accounts[0].AccessToken)
	}
	if accounts[0].RequestCount != 5 {
		t.Fatalf("expected RequestCount preserved (5), got %d", accounts[0].RequestCount)
	}
	if accounts[0].MachineId != "machine-1" {
		t.Fatalf("expected MachineId preserved, got %q", accounts[0].MachineId)
	}
	if accounts[0].Email != "user-renamed@example.com" {
		t.Fatalf("expected email refreshed, got %q", accounts[0].Email)
	}
}

// TestAddAccountKeepsDifferentUserIdsSeparate verifies distinct UserIds remain
// separate accounts even when they share the same email (e.g. same email used
// to sign in with both Google and GitHub).
func TestAddAccountKeepsDifferentUserIdsSeparate(t *testing.T) {
	if err := Init(filepath.Join(t.TempDir(), "config.json")); err != nil {
		t.Fatalf("init config: %v", err)
	}

	if err := AddAccount(Account{ID: "a", Email: "user@example.com", UserId: "google-uid", AuthMethod: "social"}); err != nil {
		t.Fatalf("add google: %v", err)
	}
	if err := AddAccount(Account{ID: "b", Email: "user@example.com", UserId: "github-uid", AuthMethod: "social"}); err != nil {
		t.Fatalf("add github: %v", err)
	}

	if got := len(GetAccounts()); got != 2 {
		t.Fatalf("expected 2 accounts for different UserIds, got %d", got)
	}
}

// TestAddAccountAlwaysAppendsEmptyUserId verifies accounts without a UserId are
// never merged together, since UserId is assigned by the Kiro API and can't be
// matched until user info has been fetched.
func TestAddAccountAlwaysAppendsEmptyUserId(t *testing.T) {
	if err := Init(filepath.Join(t.TempDir(), "config.json")); err != nil {
		t.Fatalf("init config: %v", err)
	}

	if err := AddAccount(Account{ID: "x", Email: "a@example.com", UserId: "", AuthMethod: "idc"}); err != nil {
		t.Fatalf("add first empty: %v", err)
	}
	if err := AddAccount(Account{ID: "y", Email: "b@example.com", UserId: "", AuthMethod: "idc"}); err != nil {
		t.Fatalf("add second empty: %v", err)
	}

	if got := len(GetAccounts()); got != 2 {
		t.Fatalf("expected 2 accounts with empty UserId, got %d", got)
	}
}

// TestAddAccountReturningGivesDedupedID verifies AddAccountReturning hands back
// the actually-stored Account, so dedup callers can reflect the real ID to UI
// instead of the just-constructed (non-existent) one.
func TestAddAccountReturningGivesDedupedID(t *testing.T) {
	if err := Init(filepath.Join(t.TempDir(), "config.json")); err != nil {
		t.Fatalf("init config: %v", err)
	}

	if _, err := AddAccountReturning(Account{ID: "id-1", UserId: "u1", Email: "a@x", Enabled: true}); err != nil {
		t.Fatalf("seed: %v", err)
	}

	// Re-import same UserId with a *different* input ID — should map back to id-1.
	saved, err := AddAccountReturning(Account{ID: "id-2-NEW", UserId: "u1", Email: "a-renamed@x", Enabled: true})
	if err != nil {
		t.Fatalf("re-import: %v", err)
	}
	if saved.ID != "id-1" {
		t.Fatalf("expected returned ID id-1 (existing), got %q", saved.ID)
	}
	if saved.Email != "a-renamed@x" {
		t.Fatalf("expected email refreshed, got %q", saved.Email)
	}
}
