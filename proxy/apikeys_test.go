package proxy

import (
	"encoding/json"
	"kiro-go/config"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
)

func newAuthTestRequest(t *testing.T, header, value string) *http.Request {
	t.Helper()
	r := httptest.NewRequest(http.MethodPost, "/v1/messages", strings.NewReader("{}"))
	if header != "" {
		r.Header.Set(header, value)
	}
	return r
}

func mustInitConfig(t *testing.T) {
	t.Helper()
	cfgFile := filepath.Join(t.TempDir(), "config.json")
	if err := config.Init(cfgFile); err != nil {
		t.Fatalf("config.Init: %v", err)
	}
}

// requireAuth flips the master gate on. Auth is now opt-in via RequireApiKey
// so most tests need this after seeding their keys.
func requireAuth(t *testing.T) {
	t.Helper()
	on := true
	if err := config.UpdateSettingsPatch(nil, &on, ""); err != nil {
		t.Fatalf("set requireApiKey=true: %v", err)
	}
}

func TestAuthenticateRejectsMissingKey(t *testing.T) {
	mustInitConfig(t)
	if _, err := config.AddApiKey(config.ApiKeyEntry{Name: "main", Key: "sk-good", Enabled: true}); err != nil {
		t.Fatalf("seed: %v", err)
	}
	requireAuth(t)

	h := &Handler{}
	r := httptest.NewRequest(http.MethodPost, "/v1/messages", strings.NewReader("{}"))
	entry, err := h.authenticate(r)
	if err == nil {
		t.Fatalf("expected error for missing key, got entry=%v", entry)
	}
	ae, ok := err.(*authError)
	if !ok {
		t.Fatalf("expected *authError, got %T", err)
	}
	if ae.status != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", ae.status)
	}
}

func TestAuthenticateRejectsDisabledKey(t *testing.T) {
	mustInitConfig(t)
	created, err := config.AddApiKey(config.ApiKeyEntry{Name: "off", Key: "sk-off", Enabled: false})
	if err != nil {
		t.Fatalf("seed: %v", err)
	}
	_ = created
	requireAuth(t)

	h := &Handler{}
	r := newAuthTestRequest(t, "Authorization", "Bearer sk-off")
	entry, err := h.authenticate(r)
	if err == nil {
		t.Fatalf("expected disabled key to be rejected, got entry=%v", entry)
	}
	ae, ok := err.(*authError)
	if !ok || ae.status != http.StatusUnauthorized {
		t.Fatalf("expected 401 authError, got %v", err)
	}
	if !strings.Contains(ae.message, "disabled") {
		t.Fatalf("expected disabled message, got %q", ae.message)
	}
}

func TestAuthenticateAcceptsEnabledKey(t *testing.T) {
	mustInitConfig(t)
	created, err := config.AddApiKey(config.ApiKeyEntry{Name: "ok", Key: "sk-ok", Enabled: true})
	if err != nil {
		t.Fatalf("seed: %v", err)
	}
	requireAuth(t)

	h := &Handler{}
	// Bearer header form
	r := newAuthTestRequest(t, "Authorization", "Bearer sk-ok")
	entry, err := h.authenticate(r)
	if err != nil {
		t.Fatalf("expected success, got err=%v", err)
	}
	if entry == nil || entry.ID != created.ID {
		t.Fatalf("expected entry to match seeded key, got %v", entry)
	}

	// X-Api-Key header form
	r2 := newAuthTestRequest(t, "X-Api-Key", "sk-ok")
	entry2, err := h.authenticate(r2)
	if err != nil {
		t.Fatalf("X-Api-Key path failed: %v", err)
	}
	if entry2 == nil || entry2.ID != created.ID {
		t.Fatalf("X-Api-Key path returned unexpected entry: %v", entry2)
	}
}

func TestAuthenticateRejectsOverTokenLimit(t *testing.T) {
	mustInitConfig(t)
	created, err := config.AddApiKey(config.ApiKeyEntry{
		Name: "tlimit", Key: "sk-tlimit", Enabled: true, TokenLimit: 100,
	})
	if err != nil {
		t.Fatalf("seed: %v", err)
	}
	if err := config.RecordApiKeyUsage(created.ID, 100, 0); err != nil {
		t.Fatalf("record usage: %v", err)
	}
	requireAuth(t)

	h := &Handler{}
	r := newAuthTestRequest(t, "Authorization", "Bearer sk-tlimit")
	entry, err := h.authenticate(r)
	if err == nil {
		t.Fatalf("expected token limit rejection, got entry=%v", entry)
	}
	ae, ok := err.(*authError)
	if !ok {
		t.Fatalf("expected *authError, got %T", err)
	}
	if ae.status != http.StatusTooManyRequests {
		t.Fatalf("expected 429, got %d", ae.status)
	}
	if !strings.Contains(ae.message, "token limit") {
		t.Fatalf("expected token limit message, got %q", ae.message)
	}
}

func TestAuthenticateRejectsOverCreditLimit(t *testing.T) {
	mustInitConfig(t)
	created, err := config.AddApiKey(config.ApiKeyEntry{
		Name: "climit", Key: "sk-climit", Enabled: true, CreditLimit: 1.0,
	})
	if err != nil {
		t.Fatalf("seed: %v", err)
	}
	if err := config.RecordApiKeyUsage(created.ID, 0, 1.0); err != nil {
		t.Fatalf("record usage: %v", err)
	}
	requireAuth(t)

	h := &Handler{}
	r := newAuthTestRequest(t, "Authorization", "Bearer sk-climit")
	entry, err := h.authenticate(r)
	if err == nil {
		t.Fatalf("expected credit limit rejection, got entry=%v", entry)
	}
	ae, ok := err.(*authError)
	if !ok {
		t.Fatalf("expected *authError, got %T", err)
	}
	if ae.status != http.StatusTooManyRequests {
		t.Fatalf("expected 429, got %d", ae.status)
	}
	if !strings.Contains(ae.message, "credit limit") {
		t.Fatalf("expected credit limit message, got %q", ae.message)
	}
}

func TestAuthenticateLegacyFallback(t *testing.T) {
	mustInitConfig(t)
	if err := config.UpdateSettings("legacy-key", true, ""); err != nil {
		t.Fatalf("seed legacy: %v", err)
	}
	// Sanity check: HasApiKeys returns false because UpdateSettings does not migrate.
	if config.HasApiKeys() {
		t.Fatalf("did not expect ApiKeys to be auto-populated by UpdateSettings")
	}

	h := &Handler{}
	good := newAuthTestRequest(t, "Authorization", "Bearer legacy-key")
	if _, err := h.authenticate(good); err != nil {
		t.Fatalf("expected legacy key to succeed: %v", err)
	}

	bad := newAuthTestRequest(t, "Authorization", "Bearer wrong")
	_, err := h.authenticate(bad)
	if err == nil {
		t.Fatalf("expected wrong legacy key to be rejected")
	}
	ae, ok := err.(*authError)
	if !ok || ae.status != http.StatusUnauthorized {
		t.Fatalf("expected 401 authError, got %v", err)
	}
}

func TestAuthenticateNoAuthRequired(t *testing.T) {
	mustInitConfig(t)
	// No keys configured, RequireApiKey defaults to false.
	h := &Handler{}
	r := newAuthTestRequest(t, "", "")
	entry, err := h.authenticate(r)
	if err != nil {
		t.Fatalf("expected open access when no keys configured: %v", err)
	}
	if entry != nil {
		t.Fatalf("expected nil entry when no key configured, got %v", entry)
	}
}

func TestRouteWritesUnauthorizedClaude(t *testing.T) {
	mustInitConfig(t)
	if _, err := config.AddApiKey(config.ApiKeyEntry{Name: "main", Key: "sk-claude", Enabled: true}); err != nil {
		t.Fatalf("seed: %v", err)
	}
	requireAuth(t)

	h := &Handler{}
	rec := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/v1/messages", strings.NewReader("{}"))
	h.ServeHTTP(rec, r)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d body=%s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "Invalid or missing API key") {
		t.Fatalf("expected Claude-style auth error, got body=%s", rec.Body.String())
	}
}

func TestRouteWritesTooManyRequestsOpenAI(t *testing.T) {
	mustInitConfig(t)
	created, err := config.AddApiKey(config.ApiKeyEntry{
		Name: "openai", Key: "sk-openai", Enabled: true, TokenLimit: 50,
	})
	if err != nil {
		t.Fatalf("seed: %v", err)
	}
	if err := config.RecordApiKeyUsage(created.ID, 50, 0); err != nil {
		t.Fatalf("record: %v", err)
	}
	requireAuth(t)

	h := &Handler{}
	rec := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/v1/chat/completions", strings.NewReader("{}"))
	r.Header.Set("Authorization", "Bearer sk-openai")
	h.ServeHTTP(rec, r)
	if rec.Code != http.StatusTooManyRequests {
		t.Fatalf("expected 429, got %d body=%s", rec.Code, rec.Body.String())
	}
	var payload map[string]interface{}
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("invalid JSON body: %v / %s", err, rec.Body.String())
	}
	if _, ok := payload["error"]; !ok {
		t.Fatalf("expected OpenAI-style error envelope, got %s", rec.Body.String())
	}
}

func TestRecordSuccessForApiKeyUpdatesEntry(t *testing.T) {
	mustInitConfig(t)
	created, err := config.AddApiKey(config.ApiKeyEntry{Name: "use", Key: "sk-use", Enabled: true})
	if err != nil {
		t.Fatalf("seed: %v", err)
	}

	h := &Handler{}
	h.recordSuccessForApiKey(created.ID, 25, 30, 0.75)

	got := config.GetApiKeyEntry(created.ID)
	if got == nil {
		t.Fatalf("entry missing")
	}
	if got.TokensUsed <= 0 {
		t.Fatalf("expected TokensUsed to grow, got %d", got.TokensUsed)
	}
	if got.CreditsUsed <= 0 {
		t.Fatalf("expected CreditsUsed to grow, got %v", got.CreditsUsed)
	}
	if got.RequestsCount != 1 {
		t.Fatalf("expected RequestsCount=1, got %d", got.RequestsCount)
	}
}

func TestRecordSuccessForApiKeyEmptyIDIsNoop(t *testing.T) {
	mustInitConfig(t)
	created, err := config.AddApiKey(config.ApiKeyEntry{Name: "noop", Key: "sk-noop", Enabled: true})
	if err != nil {
		t.Fatalf("seed: %v", err)
	}

	h := &Handler{}
	h.recordSuccessForApiKey("", 100, 100, 1)
	got := config.GetApiKeyEntry(created.ID)
	if got == nil {
		t.Fatalf("entry missing")
	}
	if got.TokensUsed != 0 || got.CreditsUsed != 0 || got.RequestsCount != 0 {
		t.Fatalf("expected entry untouched when apiKeyID is empty, got %+v", got)
	}
}

// Public deployments (RequireApiKey=false) must keep accepting all requests
// even after keys exist in the config — e.g. an operator drafted some keys
// but hasn't flipped the gate yet, or the legacy migration left a disabled
// entry behind.
func TestAuthenticateMasterSwitchOffPassesThrough(t *testing.T) {
	mustInitConfig(t)
	if _, err := config.AddApiKey(config.ApiKeyEntry{Name: "drafted", Key: "sk-drafted", Enabled: true}); err != nil {
		t.Fatalf("seed: %v", err)
	}
	// RequireApiKey defaults to false — do not flip it on.

	h := &Handler{}
	if entry, err := h.authenticate(newAuthTestRequest(t, "", "")); err != nil || entry != nil {
		t.Fatalf("expected open access without entry, got entry=%v err=%v", entry, err)
	}
	if entry, err := h.authenticate(newAuthTestRequest(t, "Authorization", "Bearer sk-anything")); err != nil || entry != nil {
		t.Fatalf("expected provided key to be ignored when gate is off, got entry=%v err=%v", entry, err)
	}
}

// When auth is required but no keys are configured, every request must be
// rejected. Previously the legacy fallback returned (nil,nil) and silently
// let traffic through, so the admin UI's "require API key" toggle could be
// flipped on without actually enforcing anything.
func TestAuthenticateRequiredWithoutKeysFailsClosed(t *testing.T) {
	mustInitConfig(t)
	requireAuth(t)

	h := &Handler{}
	_, err := h.authenticate(newAuthTestRequest(t, "", ""))
	ae, ok := err.(*authError)
	if !ok || ae.status != http.StatusUnauthorized {
		t.Fatalf("expected 401 authError when no keys configured, got %T %v", err, err)
	}
	if _, err := h.authenticate(newAuthTestRequest(t, "Authorization", "Bearer anything")); err == nil {
		t.Fatalf("expected provided-key path to also fail closed when nothing is configured")
	}
}
