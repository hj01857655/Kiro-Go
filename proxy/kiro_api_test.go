package proxy

import (
	"encoding/json"
	"errors"
	"io"
	"kiro-go/config"
	"net/http"
	"path/filepath"
	"strings"
	"testing"
)

func TestResolveProfileArnReturnsCachedValueWithoutRequest(t *testing.T) {
	kiroRestHttpStore.Store(&http.Client{
		Transport: roundTripFunc(func(*http.Request) (*http.Response, error) {
			t.Fatal("unexpected HTTP request for cached profile ARN")
			return nil, nil
		}),
	})
	t.Cleanup(func() { InitKiroHttpClient("") })

	account := &config.Account{ProfileArn: " arn:aws:codewhisperer:profile/test "}
	got, err := ResolveProfileArn(account)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got != "arn:aws:codewhisperer:profile/test" {
		t.Fatalf("expected trimmed cached ARN, got %q", got)
	}
}

func TestResolveProfileArnFetchesAndCachesProfile(t *testing.T) {
	configPath := filepath.Join(t.TempDir(), "config.json")
	if err := config.Init(configPath); err != nil {
		t.Fatalf("init config: %v", err)
	}
	account := config.Account{
		ID:          "acct-1",
		Email:       "user@example.com",
		AccessToken: "access-token",
		Region:      "us-east-1",
		UsageData:   json.RawMessage(`{"usageBreakdownList":[{"resourceType":"CREDIT","currentUsage":7,"usageLimit":100}]}`),
	}
	if err := config.AddAccount(account); err != nil {
		t.Fatalf("add account: %v", err)
	}

	kiroRestHttpStore.Store(&http.Client{
		Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
			if req.Method != http.MethodPost {
				t.Fatalf("expected POST, got %s", req.Method)
			}
			if req.URL.Path != "/ListAvailableProfiles" {
				t.Fatalf("expected ListAvailableProfiles path, got %s", req.URL.Path)
			}
			if got := req.Header.Get("Content-Type"); got != "application/json" {
				t.Fatalf("expected JSON content type, got %q", got)
			}
			return &http.Response{
				StatusCode: http.StatusOK,
				Body:       io.NopCloser(strings.NewReader(`{"profiles":[{"arn":" arn:aws:codewhisperer:profile/fetched "}]} `)),
				Header:     make(http.Header),
			}, nil
		}),
	})
	t.Cleanup(func() { InitKiroHttpClient("") })

	requestAccount := account
	requestAccount.UsageData = nil
	got, err := ResolveProfileArn(&requestAccount)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got != "arn:aws:codewhisperer:profile/fetched" {
		t.Fatalf("expected fetched ARN, got %q", got)
	}
	if requestAccount.ProfileArn != got {
		t.Fatalf("expected account to be updated with fetched ARN, got %q", requestAccount.ProfileArn)
	}

	accounts := config.GetAccounts()
	if len(accounts) != 1 {
		t.Fatalf("expected one persisted account, got %d", len(accounts))
	}
	if accounts[0].ProfileArn != got {
		t.Fatalf("expected persisted account profile ARN %q, got %q", got, accounts[0].ProfileArn)
	}
	wantUsage := `{"usageBreakdownList":[{"resourceType":"CREDIT","currentUsage":7,"usageLimit":100}]}`
	if string(accounts[0].UsageData) != wantUsage {
		t.Fatalf("expected profile cache update to preserve usage data, got %q", string(accounts[0].UsageData))
	}
}

type roundTripFunc func(*http.Request) (*http.Response, error)

func (fn roundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return fn(req)
}

// TestResolveProfileArnShortCircuitsBuilderID verifies that Builder ID accounts
// short-circuit immediately without making any HTTP calls, since AWS does not
// provide profile ARN for Builder ID credentials (verified by raw OIDC refresh
// response inspection — no profileArn field is ever returned).
func TestResolveProfileArnShortCircuitsBuilderID(t *testing.T) {
	kiroRestHttpStore.Store(&http.Client{
		Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
			t.Fatalf("Builder ID account should not trigger any HTTP request, but saw %s %s", req.Method, req.URL)
			return nil, nil
		}),
	})
	t.Cleanup(func() { InitKiroHttpClient("") })

	account := &config.Account{
		ID:           "acct-builderid",
		Email:        "user@example.com",
		Provider:     "BuilderId",
		AccessToken:  "access",
		RefreshToken: "refresh",
		// No ProfileArn cached
	}
	_, err := ResolveProfileArn(account)
	if err == nil {
		t.Fatal("expected error for Builder ID account, got nil")
	}
	if !errors.Is(err, ErrProfileArnUnsupported) {
		t.Fatalf("expected ErrProfileArnUnsupported sentinel, got %v", err)
	}
}
