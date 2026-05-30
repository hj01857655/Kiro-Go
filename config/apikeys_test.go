package config

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
	"sync/atomic"
	"testing"
)

func TestApiKeyMigrationFromLegacyField(t *testing.T) {
	dir := t.TempDir()
	cfgFile := filepath.Join(dir, "config.json")

	// Seed a config file in the legacy shape (no apiKeys list, single ApiKey field).
	seed := map[string]interface{}{
		"password":      "p",
		"port":          8080,
		"host":          "0.0.0.0",
		"apiKey":        "legacy-secret",
		"requireApiKey": true,
		"accounts":      []interface{}{},
	}
	raw, err := json.MarshalIndent(seed, "", "  ")
	if err != nil {
		t.Fatalf("marshal seed: %v", err)
	}
	if err := os.WriteFile(cfgFile, raw, 0600); err != nil {
		t.Fatalf("write seed: %v", err)
	}

	if err := Init(cfgFile); err != nil {
		t.Fatalf("init: %v", err)
	}

	keys := ListApiKeys()
	if len(keys) != 1 {
		t.Fatalf("expected one migrated key, got %d", len(keys))
	}
	migrated := keys[0]
	if migrated.Key != "legacy-secret" {
		t.Fatalf("expected migrated key value, got %q", migrated.Key)
	}
	if !migrated.Migrated {
		t.Fatalf("expected migrated flag to be true")
	}
	if !migrated.Enabled {
		t.Fatalf("expected migrated key to be enabled")
	}
	if migrated.ID == "" {
		t.Fatalf("expected migrated key to have an ID")
	}

	// Reload and confirm migration was persisted (no second migration entry appears).
	if err := Init(cfgFile); err != nil {
		t.Fatalf("re-init: %v", err)
	}
	if got := len(ListApiKeys()); got != 1 {
		t.Fatalf("expected migration to be idempotent, got %d entries", got)
	}
}

// Public deployments (RequireApiKey=false) must not silently start enforcing
// auth after upgrade. The migrated legacy entry is created disabled so the
// service stays open until an operator explicitly toggles auth on.
func TestApiKeyMigrationPublicDeploymentStaysDisabled(t *testing.T) {
	dir := t.TempDir()
	cfgFile := filepath.Join(dir, "config.json")

	seed := map[string]interface{}{
		"password":      "p",
		"port":          8080,
		"host":          "0.0.0.0",
		"apiKey":        "legacy-secret",
		"requireApiKey": false,
		"accounts":      []interface{}{},
	}
	raw, err := json.MarshalIndent(seed, "", "  ")
	if err != nil {
		t.Fatalf("marshal seed: %v", err)
	}
	if err := os.WriteFile(cfgFile, raw, 0600); err != nil {
		t.Fatalf("write seed: %v", err)
	}

	if err := Init(cfgFile); err != nil {
		t.Fatalf("init: %v", err)
	}

	keys := ListApiKeys()
	if len(keys) != 1 {
		t.Fatalf("expected one migrated key, got %d", len(keys))
	}
	if keys[0].Enabled {
		t.Fatalf("expected migrated key to be disabled when legacy deployment was public")
	}
	if !keys[0].Migrated {
		t.Fatalf("expected migrated flag to remain set")
	}
}

func TestApiKeyCRUD(t *testing.T) {
	cfgFile := filepath.Join(t.TempDir(), "config.json")
	if err := Init(cfgFile); err != nil {
		t.Fatalf("init: %v", err)
	}

	created, err := AddApiKey(ApiKeyEntry{Name: "alpha", Key: "sk-alpha", Enabled: true, TokenLimit: 1000})
	if err != nil {
		t.Fatalf("add alpha: %v", err)
	}
	if created.ID == "" {
		t.Fatalf("expected ID to be assigned")
	}
	if created.CreatedAt == 0 {
		t.Fatalf("expected CreatedAt to be set")
	}

	if _, err := AddApiKey(ApiKeyEntry{Name: "dup", Key: "sk-alpha", Enabled: true}); err == nil {
		t.Fatalf("expected duplicate add to fail")
	}

	if _, err := AddApiKey(ApiKeyEntry{Name: "empty", Key: "", Enabled: true}); err == nil {
		t.Fatalf("expected empty key add to fail")
	}

	if err := UpdateApiKey(created.ID, ApiKeyEntry{
		Name:        "alpha-renamed",
		Enabled:     false,
		TokenLimit:  2000,
		CreditLimit: 5.5,
	}); err != nil {
		t.Fatalf("update: %v", err)
	}
	got := GetApiKeyEntry(created.ID)
	if got == nil {
		t.Fatalf("expected entry to exist after update")
	}
	if got.Name != "alpha-renamed" {
		t.Fatalf("expected name to be updated, got %q", got.Name)
	}
	if got.Enabled {
		t.Fatalf("expected enabled to be flipped off")
	}
	if got.TokenLimit != 2000 || got.CreditLimit != 5.5 {
		t.Fatalf("expected limits to be updated, got token=%d credit=%v", got.TokenLimit, got.CreditLimit)
	}
	if got.Key != "sk-alpha" {
		t.Fatalf("expected key value to remain unchanged when patch.Key is empty, got %q", got.Key)
	}

	if found := FindApiKeyByValue("sk-alpha"); found == nil || found.ID != created.ID {
		t.Fatalf("FindApiKeyByValue should locate the entry")
	}
	if found := FindApiKeyByValue("does-not-exist"); found != nil {
		t.Fatalf("FindApiKeyByValue should return nil for unknown keys")
	}

	if err := DeleteApiKey(created.ID); err != nil {
		t.Fatalf("delete: %v", err)
	}
	if got := GetApiKeyEntry(created.ID); got != nil {
		t.Fatalf("expected entry to be removed")
	}
	if len(ListApiKeys()) != 0 {
		t.Fatalf("expected list to be empty after delete")
	}
}

func TestRecordApiKeyUsageConcurrent(t *testing.T) {
	cfgFile := filepath.Join(t.TempDir(), "config.json")
	if err := Init(cfgFile); err != nil {
		t.Fatalf("init: %v", err)
	}
	created, err := AddApiKey(ApiKeyEntry{Name: "race", Key: "sk-race", Enabled: true})
	if err != nil {
		t.Fatalf("add: %v", err)
	}

	const goroutines = 16
	const perGoroutine = 25
	var wg sync.WaitGroup
	wg.Add(goroutines)

	var failures int32
	for g := 0; g < goroutines; g++ {
		go func() {
			defer wg.Done()
			for i := 0; i < perGoroutine; i++ {
				if err := RecordApiKeyUsage(created.ID, 7, 0.5); err != nil {
					atomic.AddInt32(&failures, 1)
					return
				}
			}
		}()
	}
	wg.Wait()

	if failures != 0 {
		t.Fatalf("RecordApiKeyUsage encountered %d errors", failures)
	}
	got := GetApiKeyEntry(created.ID)
	if got == nil {
		t.Fatalf("entry missing after concurrent updates")
	}
	expectedTokens := int64(goroutines * perGoroutine * 7)
	expectedCredits := float64(goroutines*perGoroutine) * 0.5
	expectedRequests := int64(goroutines * perGoroutine)
	if got.TokensUsed != expectedTokens {
		t.Fatalf("TokensUsed mismatch: got %d want %d", got.TokensUsed, expectedTokens)
	}
	if got.CreditsUsed != expectedCredits {
		t.Fatalf("CreditsUsed mismatch: got %v want %v", got.CreditsUsed, expectedCredits)
	}
	if got.RequestsCount != expectedRequests {
		t.Fatalf("RequestsCount mismatch: got %d want %d", got.RequestsCount, expectedRequests)
	}
}

func TestResetApiKeyUsage(t *testing.T) {
	cfgFile := filepath.Join(t.TempDir(), "config.json")
	if err := Init(cfgFile); err != nil {
		t.Fatalf("init: %v", err)
	}
	created, err := AddApiKey(ApiKeyEntry{Name: "reset", Key: "sk-reset", Enabled: true})
	if err != nil {
		t.Fatalf("add: %v", err)
	}
	if err := RecordApiKeyUsage(created.ID, 100, 1.5); err != nil {
		t.Fatalf("record: %v", err)
	}
	if err := ResetApiKeyUsage(created.ID); err != nil {
		t.Fatalf("reset: %v", err)
	}
	got := GetApiKeyEntry(created.ID)
	if got == nil {
		t.Fatalf("entry missing")
	}
	if got.TokensUsed != 0 || got.CreditsUsed != 0 || got.RequestsCount != 0 {
		t.Fatalf("expected counters to be zeroed, got %+v", got)
	}
}

func TestApiKeyOverLimit(t *testing.T) {
	tests := []struct {
		name        string
		entry       ApiKeyEntry
		wantToken   bool
		wantCredit  bool
	}{
		{"unlimited", ApiKeyEntry{TokensUsed: 100, CreditsUsed: 5}, false, false},
		{"under token limit", ApiKeyEntry{TokenLimit: 200, TokensUsed: 100}, false, false},
		{"at token limit", ApiKeyEntry{TokenLimit: 100, TokensUsed: 100}, true, false},
		{"over token limit", ApiKeyEntry{TokenLimit: 100, TokensUsed: 150}, true, false},
		{"over credit limit", ApiKeyEntry{CreditLimit: 1, CreditsUsed: 2}, false, true},
		{"both over", ApiKeyEntry{TokenLimit: 1, TokensUsed: 2, CreditLimit: 1, CreditsUsed: 2}, true, true},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			gotT, gotC := ApiKeyOverLimit(tc.entry)
			if gotT != tc.wantToken || gotC != tc.wantCredit {
				t.Fatalf("ApiKeyOverLimit(%+v) = (%v,%v), want (%v,%v)",
					tc.entry, gotT, gotC, tc.wantToken, tc.wantCredit)
			}
		})
	}
}

func TestMaskApiKey(t *testing.T) {
	tests := []struct {
		in   string
		want string
	}{
		{"", ""},
		{"short", "short"},
		{"sk-1234567890", "sk-123****7890"},
	}
	for _, tc := range tests {
		if got := MaskApiKey(tc.in); got != tc.want {
			t.Fatalf("MaskApiKey(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

func TestGenerateApiKeyValueIsUnique(t *testing.T) {
	a := GenerateApiKeyValue()
	b := GenerateApiKeyValue()
	if a == b {
		t.Fatalf("expected unique generated keys, got identical %q", a)
	}
	if len(a) < 10 {
		t.Fatalf("expected non-trivial key length, got %q", a)
	}
}
