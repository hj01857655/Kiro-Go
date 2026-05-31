package auth

import "net/http"

// 本文件仅供测试使用：暴露内部可注入点，让测试能拦截网络调用而不触发真实请求。
// 生产代码不应调用这些函数。

// SetOIDCTokenURLForTest 替换 OIDC token URL 构造器。仅测试用。
func SetOIDCTokenURLForTest(fn func(region string) string) {
	if fn == nil {
		return
	}
	oidcTokenURL = fn
}

// GetOIDCTokenURLForTest 返回当前 OIDC token URL 构造器，便于测试替换后恢复。
func GetOIDCTokenURLForTest() func(region string) string { return oidcTokenURL }

// SetSocialTokenURLForTest 替换 social token URL 构造器。仅测试用。
func SetSocialTokenURLForTest(fn func() string) {
	if fn == nil {
		return
	}
	socialTokenURL = fn
}

// GetSocialTokenURLForTest 返回当前 social token URL 构造器，便于测试替换后恢复。
func GetSocialTokenURLForTest() func() string { return socialTokenURL }

// SetUserInfoURLForTest 替换 GetUserInfo 的 endpoint 构造器。仅测试用，
// 让 import happy-path 能完全离线（GetUserInfo 默认会打真实 q.us-east-1）。
func SetUserInfoURLForTest(fn func() string) {
	if fn == nil {
		return
	}
	userInfoURL = fn
}

// GetUserInfoURLForTest 返回当前 GetUserInfo endpoint 构造器，便于测试替换后恢复。
func GetUserInfoURLForTest() func() string { return userInfoURL }

// SetGlobalAuthClientForTest 替换全局 auth HTTP 客户端。
// 包的 init() 会装一个 Transport 调用 http.ProxyFromEnvironment 的客户端，
// 而该函数在首次调用时会缓存环境变量——这会污染后续依赖 t.Setenv("HTTPS_PROXY", ...)
// 的测试。需要对 httptest server 发请求的测试应装一个 Proxy=nil 的客户端以保持
// env-proxy 状态干净。返回旧客户端，便于调用方恢复。
func SetGlobalAuthClientForTest(c *http.Client) *http.Client {
	old := httpClientStore.Load()
	if c != nil {
		httpClientStore.Store(c)
	}
	return old
}
