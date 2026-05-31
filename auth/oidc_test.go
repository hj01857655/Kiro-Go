package auth

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

// newTestClient 返回一个 Proxy=nil 的客户端，避免污染依赖 env-proxy 的其它测试。
func newTestClient() *http.Client {
	return &http.Client{Timeout: 5 * time.Second, Transport: &http.Transport{}}
}

// TestRefreshOIDCRejectsEmptyAccessTokenOn200 守护回归：上游/恶意 per-account 代理
// 返回 HTTP 200 但 accessToken 为空（{} 或空体）时，刷新必须报错，绝不能返回空串让
// 调用方无条件覆盖并持久化原本有效的 token，把账号刷成鉴权失效。
func TestRefreshOIDCRejectsEmptyAccessTokenOn200(t *testing.T) {
	cases := map[string]string{
		"empty object":            `{}`,
		"empty body":              ``,
		"explicit empty token":    `{"accessToken":"","refreshToken":"rt","expiresIn":3600}`,
		"only refresh+expires":    `{"refreshToken":"rt","expiresIn":3600}`,
	}
	for name, payload := range cases {
		t.Run(name, func(t *testing.T) {
			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set("Content-Type", "application/json")
				fmt.Fprint(w, payload)
			}))
			defer srv.Close()

			old := GetOIDCTokenURLForTest()
			SetOIDCTokenURLForTest(func(string) string { return srv.URL })
			defer SetOIDCTokenURLForTest(old)

			at, rt, exp, arn, err := refreshOIDCToken("rt-old", "cid", "csecret", "us-east-1", newTestClient())
			if err == nil {
				t.Fatalf("expected error on 200 empty accessToken, got nil (at=%q rt=%q exp=%d arn=%q)", at, rt, exp, arn)
			}
			if at != "" {
				t.Fatalf("expected empty accessToken returned on error, got %q", at)
			}
		})
	}
}

// TestRefreshOIDCHappyPath 确认正常刷新（200 + 非空 accessToken）仍按上游 expiresIn 返回。
func TestRefreshOIDCHappyPath(t *testing.T) {
	const expiresIn = 3600
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"accessToken":"at-new","refreshToken":"rt-rotated","expiresIn":%d,"profileArn":"arn:test"}`, expiresIn)
	}))
	defer srv.Close()

	old := GetOIDCTokenURLForTest()
	SetOIDCTokenURLForTest(func(string) string { return srv.URL })
	defer SetOIDCTokenURLForTest(old)

	before := time.Now().Unix()
	at, rt, exp, arn, err := refreshOIDCToken("rt-old", "cid", "csecret", "us-east-1", newTestClient())
	after := time.Now().Unix()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if at != "at-new" {
		t.Fatalf("accessToken = %q, want at-new", at)
	}
	if rt != "rt-rotated" {
		t.Fatalf("refreshToken = %q, want rt-rotated", rt)
	}
	if arn != "arn:test" {
		t.Fatalf("profileArn = %q, want arn:test", arn)
	}
	if exp < before+expiresIn || exp > after+expiresIn {
		t.Fatalf("expiresAt = %d, want in [%d..%d]", exp, before+expiresIn, after+expiresIn)
	}
}

// TestRefreshSocialRejectsEmptyAccessTokenOn200 同 OIDC：social 刷新 200 空 token 必须报错。
func TestRefreshSocialRejectsEmptyAccessTokenOn200(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, `{}`)
	}))
	defer srv.Close()

	old := GetSocialTokenURLForTest()
	SetSocialTokenURLForTest(func() string { return srv.URL })
	defer SetSocialTokenURLForTest(old)

	at, _, _, _, err := refreshSocialToken("rt-old", newTestClient())
	if err == nil {
		t.Fatalf("expected error on 200 empty accessToken, got nil")
	}
	if at != "" {
		t.Fatalf("expected empty accessToken on error, got %q", at)
	}
}

// TestRefreshSocialHappyPath 确认 social 正常刷新仍返回上游值。
func TestRefreshSocialHappyPath(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, `{"accessToken":"at-social","refreshToken":"rt-social","expiresIn":1800}`)
	}))
	defer srv.Close()

	old := GetSocialTokenURLForTest()
	SetSocialTokenURLForTest(func() string { return srv.URL })
	defer SetSocialTokenURLForTest(old)

	at, rt, _, _, err := refreshSocialToken("rt-old", newTestClient())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if at != "at-social" {
		t.Fatalf("accessToken = %q, want at-social", at)
	}
	if rt != "rt-social" {
		t.Fatalf("refreshToken = %q, want rt-social", rt)
	}
}
