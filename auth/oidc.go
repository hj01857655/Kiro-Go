package auth

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"kiro-go/config"
	"net/http"
	"time"
)

// oidcTokenURL 构造 idc/builderId 刷新 endpoint。提成变量以便测试拦截网络调用，
// 生产行为与原硬编码完全一致。
var oidcTokenURL = func(region string) string {
	return fmt.Sprintf("https://oidc.%s.amazonaws.com/token", region)
}

// socialTokenURL 构造 social (GitHub/Google) 刷新 endpoint。提成变量以便测试拦截。
var socialTokenURL = func() string {
	return "https://prod.us-east-1.auth.desktop.kiro.dev/refreshToken"
}

// RefreshToken 刷新 access token
// Returns: accessToken, refreshToken, expiresAt, profileArn, error
func RefreshToken(account *config.Account) (string, string, int64, string, error) {
	// Resolve per-account proxy: account.ProxyURL > global config
	proxyURL := account.ProxyURL
	if proxyURL == "" {
		proxyURL = config.GetProxyURL()
	}
	client := GetAuthClientForProxy(proxyURL)

	if account.AuthMethod == "social" {
		return refreshSocialToken(account.RefreshToken, client)
	}
	return refreshOIDCToken(account.RefreshToken, account.ClientID, account.ClientSecret, account.Region, client)
}

// refreshOIDCToken IdC/Builder ID token 刷新
func refreshOIDCToken(refreshToken, clientID, clientSecret, region string, client *http.Client) (string, string, int64, string, error) {
	if clientID == "" || clientSecret == "" {
		return "", "", 0, "", fmt.Errorf("OIDC refresh requires clientId and clientSecret")
	}
	if region == "" {
		region = "us-east-1"
	}

	url := oidcTokenURL(region)

	payload := map[string]string{
		"clientId":     clientID,
		"clientSecret": clientSecret,
		"refreshToken": refreshToken,
		"grantType":    "refresh_token",
	}

	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", url, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return "", "", 0, "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		respBody, _ := io.ReadAll(resp.Body)
		return "", "", 0, "", fmt.Errorf("refresh failed: %d %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		AccessToken  string `json:"accessToken"`
		RefreshToken string `json:"refreshToken"`
		ExpiresIn    int    `json:"expiresIn"`
		ProfileArn   string `json:"profileArn"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", "", 0, "", err
	}

	// 200 但 accessToken 为空（上游异常 / 恶意 per-account 代理返回 {} 或空体）
	// 必须当失败处理。否则调用方会无条件用空串覆盖并持久化原本有效的 token，
	// 把账号刷成鉴权失效。宁可让本次刷新报错走重试/失败路径，也不污染已有凭据。
	if result.AccessToken == "" {
		return "", "", 0, "", fmt.Errorf("refresh returned empty accessToken (HTTP 200)")
	}

	expiresAt := time.Now().Unix() + int64(result.ExpiresIn)
	return result.AccessToken, result.RefreshToken, expiresAt, result.ProfileArn, nil
}

// refreshSocialToken Social (GitHub/Google) token 刷新
func refreshSocialToken(refreshToken string, client *http.Client) (string, string, int64, string, error) {
	url := socialTokenURL()

	payload := map[string]string{
		"refreshToken": refreshToken,
	}

	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", url, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return "", "", 0, "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		respBody, _ := io.ReadAll(resp.Body)
		return "", "", 0, "", fmt.Errorf("refresh failed: %d %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		AccessToken  string `json:"accessToken"`
		RefreshToken string `json:"refreshToken"`
		ExpiresIn    int    `json:"expiresIn"`
		ProfileArn   string `json:"profileArn"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", "", 0, "", err
	}

	// 同 refreshOIDCToken：200 空 accessToken 视为失败，避免空串覆盖有效凭据。
	if result.AccessToken == "" {
		return "", "", 0, "", fmt.Errorf("social refresh returned empty accessToken (HTTP 200)")
	}

	expiresAt := time.Now().Unix() + int64(result.ExpiresIn)
	return result.AccessToken, result.RefreshToken, expiresAt, result.ProfileArn, nil
}
