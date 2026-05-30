package config

import (
	"encoding/json"
	"path/filepath"
	"testing"
)

func TestUpdateSettingsPatchPreservesOmittedAPIKeyFields(t *testing.T) {
	if err := Init(filepath.Join(t.TempDir(), "config.json")); err != nil {
		t.Fatalf("init config: %v", err)
	}
	if err := UpdateSettings("proxy-api-key", true, "admin-password"); err != nil {
		t.Fatalf("seed settings: %v", err)
	}

	if err := UpdateSettingsPatch(nil, nil, "new-admin-password", nil, nil); err != nil {
		t.Fatalf("patch settings: %v", err)
	}

	if got := GetApiKey(); got != "proxy-api-key" {
		t.Fatalf("expected API key to be preserved, got %q", got)
	}
	if !IsApiKeyRequired() {
		t.Fatalf("expected requireApiKey to stay enabled")
	}
	if !VerifyPassword("new-admin-password") {
		t.Fatalf("expected password to update to new-admin-password")
	}
}

func TestUpdateSettingsPatchCanExplicitlyDisableAPIKey(t *testing.T) {
	if err := Init(filepath.Join(t.TempDir(), "config.json")); err != nil {
		t.Fatalf("init config: %v", err)
	}
	if err := UpdateSettings("proxy-api-key", true, "admin-password"); err != nil {
		t.Fatalf("seed settings: %v", err)
	}

	emptyKey := ""
	requireAPIKey := false
	if err := UpdateSettingsPatch(&emptyKey, &requireAPIKey, "", nil, nil); err != nil {
		t.Fatalf("patch settings: %v", err)
	}

	if got := GetApiKey(); got != "" {
		t.Fatalf("expected API key to be cleared, got %q", got)
	}
	if IsApiKeyRequired() {
		t.Fatalf("expected requireApiKey to be disabled")
	}
	if !VerifyPassword("admin-password") {
		t.Fatalf("expected password to be preserved as admin-password")
	}
}

// TestAccountUsageDataRoundTrip verifies that a raw /getUsageLimits response
// persisted via UpdateAccountUsageData survives a save/load cycle intact, and
// that an empty payload is a no-op (never wipes previously-stored usage).
func TestAccountUsageDataRoundTrip(t *testing.T) {
	cfgFile := filepath.Join(t.TempDir(), "config.json")
	if err := Init(cfgFile); err != nil {
		t.Fatalf("init: %v", err)
	}
	if err := AddAccount(Account{ID: "acc", Enabled: true}); err != nil {
		t.Fatalf("add account: %v", err)
	}

	raw := json.RawMessage(`{"overageConfiguration":{"overageStatus":"ENABLED"},"usageBreakdownList":[{"resourceType":"CREDIT","currentUsage":1060.54,"usageLimit":1000,"overageCharges":2.42}]}`)
	if err := UpdateAccountUsageData("acc", raw); err != nil {
		t.Fatalf("update usage data: %v", err)
	}

	accounts := GetAccounts()
	if len(accounts) != 1 {
		t.Fatalf("expected one account, got %d", len(accounts))
	}
	if string(accounts[0].UsageData) != string(raw) {
		t.Fatalf("expected usage data round-trip, got %q", string(accounts[0].UsageData))
	}
	if accounts[0].LastRefresh == 0 {
		t.Fatalf("expected LastRefresh to be set after usage update")
	}

	// Empty payload must not wipe the stored usage.
	if err := UpdateAccountUsageData("acc", nil); err != nil {
		t.Fatalf("update with empty usage data: %v", err)
	}
	if string(GetAccounts()[0].UsageData) != string(raw) {
		t.Fatalf("empty payload must not clear stored usage data")
	}
}
