package proxy

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"kiro-go/auth"
	"kiro-go/config"
	"kiro-go/logger"
	"net/http"
	neturl "net/url"
	"strings"
	"time"
)

const (
	kiroRestAPIBase = "https://codewhisperer.us-east-1.amazonaws.com"
)

// GetUsageLimits 获取账户使用量和订阅信息。
// 同时返回解析后的结构体与原始响应字节：原始字节整体存入 Account.UsageData，
// 保证 overageCharges / *WithPrecision / currency 等上游字段零丢失。
func GetUsageLimits(account *config.Account) (*UsageLimitsResponse, json.RawMessage, error) {
	url := fmt.Sprintf("%s/getUsageLimits?origin=AI_EDITOR&resourceType=AGENTIC_REQUEST&isEmailRequired=true", kiroRestAPIBase)
	url = withProfileArnQuery(url, account)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, nil, err
	}

	setKiroHeaders(req, account)

	resp, err := GetRestClientForProxy(ResolveAccountProxyURL(account)).Do(req)
	if err != nil {
		return nil, nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, nil, err
	}
	// 无论状态码，完整原始响应体都留档到 data/upstream.log（持久化，便于事后审查）。
	// 控制台是否打印响应体由状态码决定，见下方。
	config.AppendUpstreamLog("getUsageLimits", resp.StatusCode, string(body))

	if resp.StatusCode != 200 {
		// 非 200：body 额外随 error 透传，调用方会打到控制台日志，便于即时排查。
		return nil, nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(body))
	}

	// 200 成功：body 已写入 upstream.log；控制台仅由调用方打一行简提，不刷屏。
	var result UsageLimitsResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, nil, err
	}
	return &result, json.RawMessage(body), nil
}

// GetUserInfo 获取用户信息
func GetUserInfo(account *config.Account) (*UserInfoResponse, error) {
	url := fmt.Sprintf("%s/GetUserInfo", kiroRestAPIBase)

	payload := `{"origin":"KIRO_IDE"}`
	req, err := http.NewRequest("POST", url, strings.NewReader(payload))
	if err != nil {
		return nil, err
	}

	setKiroHeaders(req, account)
	req.Header.Set("Content-Type", "application/json")

	resp, err := GetRestClientForProxy(ResolveAccountProxyURL(account)).Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(body))
	}

	var result UserInfoResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return &result, nil
}

// ListAvailableModels 获取可用模型列表
func ListAvailableModels(account *config.Account) ([]ModelInfo, error) {
	url := fmt.Sprintf("%s/ListAvailableModels?origin=AI_EDITOR&maxResults=50", kiroRestAPIBase)
	url = withProfileArnQuery(url, account)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	setKiroHeaders(req, account)

	resp, err := GetRestClientForProxy(ResolveAccountProxyURL(account)).Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	// 无论状态码，完整原始响应体都留档到 data/upstream.log（持久化，便于事后审查）。
	// 控制台是否打印响应体由状态码决定，见下方。
	config.AppendUpstreamLog("ListAvailableModels", resp.StatusCode, string(body))

	if resp.StatusCode != 200 {
		// 非 200：body 额外随 error 透传，调用方会打到控制台日志，便于即时排查。
		return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(body))
	}

	// 200 成功：body 已写入 upstream.log；控制台仅由调用方打一行简提，不刷屏。
	var result struct {
		Models []ModelInfo `json:"models"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}
	return result.Models, nil
}

// ResolveProfileArn returns the account profile ARN, fetching and caching it
// ErrProfileArnUnsupported indicates the account type does not support profile
// ARN resolution. Callers can use errors.Is to distinguish this expected
// condition from real failures and skip noisy logs.
var ErrProfileArnUnsupported = fmt.Errorf("profile ARN not available for this account type")

// supportsProfiles 判断给定账号的凭据是否支持 profile ARN 解析。
//
// 规则对齐 Kiro IDE 客户端 supportsProfiles(token):
//
//	const isIdCProvider = provider === "Enterprise" || "Internal" || "BuilderId";
//	const isExternalIdp = authMethod === "external_idp" || provider === "ExternalIdp";
//	const isSocial      = authMethod === "social";
//	return isIdCProvider || isExternalIdp || isSocial;
func supportsProfiles(account *config.Account) bool {
	if account == nil {
		return false
	}
	isIdCProvider := account.Provider == "Enterprise" ||
		account.Provider == "Internal" ||
		account.Provider == "BuilderId"
	isExternalIdp := account.AuthMethod == "external_idp" ||
		account.Provider == "ExternalIdp"
	isSocial := account.AuthMethod == "social"
	return isIdCProvider || isExternalIdp || isSocial
}

// socialSignInProfileArn 与 fixedProfileArns 直接照搬 Kiro IDE
// (packages/.../list-available-profiles.ts) 的硬编码常量。
//
// 关键发现：IDE 对 BuilderId / Github / Google 这三类账号【根本不调用】AWS 的
// ListAvailableProfiles，而是在 getAllProfiles 第一步用固定 ARN 短路返回。AWS 端
// 对 Builder ID 调 ListAvailableProfiles 会回 403 "AWS Builder ID is not supported
// for this operation" —— 所以 IDE 干脆不发那个请求，直接用下面这张固定表的值。
const socialSignInProfileArn = "arn:aws:codewhisperer:us-east-1:699475941385:profile/EHGA3GRVQMUK"

var fixedProfileArns = map[string]string{
	"BuilderId": "arn:aws:codewhisperer:us-east-1:638616132270:profile/AAAACCCCXXXX",
	"Github":    socialSignInProfileArn,
	"Google":    socialSignInProfileArn,
}

// getFixedProfileArn 返回该 provider 对应的硬编码 profileArn（若有）。
//
// IDE 的 getFixedProfileArn 对 social(Github/Google)账号会优先返回 token
// 自带的 profileArn，再回退固定值。本实现里那条 social 分支【够不到】：
// ResolveProfileArn 第一步「缓存优先」已经在 account.ProfileArn 非空时直接
// 返回了，而 social 账号 token 自带的 profileArn 正是存放在这个字段里。所以
// 一旦走到这里，account.ProfileArn 必为空，无需再判 social —— 直接回固定值。
func getFixedProfileArn(account *config.Account) (string, bool) {
	if account == nil {
		return "", false
	}
	fixed, ok := fixedProfileArns[account.Provider]
	if !ok || fixed == "" {
		return "", false
	}
	return fixed, true
}

// ResolveProfileArn returns the account profile ARN, fetching and caching it
// when it is missing. Behavior mirrors Kiro IDE's resolveProfileArn:
//  1. Cached value wins.
//  2. BuilderId / Github / Google use a hard-coded fixed ARN and NEVER call
//     AWS ListAvailableProfiles (IDE getAllProfiles short-circuits the same way;
//     AWS 403s Builder ID on that endpoint, so the IDE just supplies a fixed ARN).
//  3. Tokens whose type does not support profiles short-circuit to
//     ErrProfileArnUnsupported (callers should silence the log).
//  4. Otherwise (Enterprise/Internal/ExternalIdp) try ListAvailableProfiles,
//     then fall back to a token refresh (the OIDC refresh response includes
//     profileArn for those account types).
func ResolveProfileArn(account *config.Account) (string, error) {
	if account == nil {
		return "", fmt.Errorf("account is nil")
	}
	if profileArn := strings.TrimSpace(account.ProfileArn); profileArn != "" {
		return profileArn, nil
	}

	// BuilderId / Github / Google：直接用固定 ARN，不发任何 AWS 请求（与 IDE 一致）。
	// 这避免了对 Builder ID 调 ListAvailableProfiles 必然 403、进而每次请求白刷 token
	// 并刷 WARN 的问题。
	if fixed, ok := getFixedProfileArn(account); ok {
		if updateErr := config.UpdateAccountProfileArn(account.ID, fixed); updateErr != nil {
			logger.Warnf("[ProfileArn] Failed to cache fixed profile ARN for %s: %v", account.Email, updateErr)
		}
		account.ProfileArn = fixed
		return fixed, nil
	}

	// 不支持 profileArn 的凭据类型直接短路（与 IDE 客户端 guard 一致）。
	if !supportsProfiles(account) {
		return "", ErrProfileArnUnsupported
	}

	// Step 1: ListAvailableProfiles, retrying on transient failures (network/5xx/429).
	listArn, listErr := listAvailableProfilesWithRetry(account)
	if listErr == nil && listArn != "" {
		if updateErr := config.UpdateAccountProfileArn(account.ID, listArn); updateErr != nil {
			logger.Warnf("[ProfileArn] Failed to cache profile ARN for %s: %v", account.Email, updateErr)
		}
		account.ProfileArn = listArn
		return listArn, nil
	}

	// Step 2: fallback - refresh token to get profileArn from auth response
	var refreshErr error
	if account.RefreshToken != "" {
		var refreshedArn string
		_, _, _, refreshedArn, refreshErr = auth.RefreshToken(account)
		if refreshErr == nil && refreshedArn != "" {
			if updateErr := config.UpdateAccountProfileArn(account.ID, refreshedArn); updateErr != nil {
				logger.Warnf("[ProfileArn] Failed to cache profile ARN for %s: %v", account.Email, updateErr)
			}
			account.ProfileArn = refreshedArn
			return refreshedArn, nil
		}
	}

	// 没有响应体可透传 —— 拼出"两步分别失败原因"的诊断错误，
	// 比单纯的 "no available Kiro profile" 信息量更大。
	hasRefreshToken := account.RefreshToken != ""
	switch {
	case listErr != nil && refreshErr != nil:
		return "", fmt.Errorf("no available Kiro profile (list: %v; refresh: %v)", listErr, refreshErr)
	case listErr != nil && !hasRefreshToken:
		return "", fmt.Errorf("no available Kiro profile (list: %v; no refresh token)", listErr)
	case listErr != nil:
		// listErr 失败、有 refresh token、refreshErr 为 nil —— 唯一可能是 refresh 调用成功
		// 但响应体里 profileArn 字段为空（典型场景：Builder ID 账号通过 Amazon OIDC
		// 刷新时上游不返回 profileArn）。
		return "", fmt.Errorf("no available Kiro profile (list: %v; refresh succeeded but returned no profileArn — likely a Builder ID account)", listErr)
	case refreshErr != nil:
		return "", fmt.Errorf("no available Kiro profile (list returned empty; refresh: %v)", refreshErr)
	case !hasRefreshToken:
		return "", fmt.Errorf("no available Kiro profile (list returned empty; no refresh token)")
	default:
		return "", fmt.Errorf("no available Kiro profile (list and refresh both returned empty)")
	}
}

func listAvailableProfilesWithRetry(account *config.Account) (string, error) {
	// Retry transient failures (network errors, 5xx, 429) with short backoff.
	// An empty profile list or 4xx (other than 429) is treated as authoritative
	// and not retried — they reflect account state, not upstream flakiness.
	const maxAttempts = 3
	backoff := 200 * time.Millisecond

	var lastErr error
	for attempt := 1; attempt <= maxAttempts; attempt++ {
		profileArn, err := listAvailableProfiles(account)
		if err == nil {
			return profileArn, nil
		}
		lastErr = err
		if !isTransientProfileFetchError(err) || attempt == maxAttempts {
			return "", err
		}
		logger.Debugf("[ProfileArn] ListAvailableProfiles transient failure for %s (attempt %d/%d): %v",
			account.Email, attempt, maxAttempts, err)
		time.Sleep(backoff)
		backoff *= 2
	}
	return "", lastErr
}

// isTransientProfileFetchError reports whether a ListAvailableProfiles error
// is worth retrying. Network errors and upstream 5xx/429 are transient; other
// HTTP errors and an empty profile list are not.
func isTransientProfileFetchError(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	if strings.Contains(msg, "empty profile list") {
		return false
	}
	if strings.HasPrefix(msg, "HTTP ") {
		return strings.HasPrefix(msg, "HTTP 5") || strings.HasPrefix(msg, "HTTP 429")
	}
	// Non-HTTP errors are network/transport level — retry.
	return true
}

func listAvailableProfiles(account *config.Account) (string, error) {
	req, err := http.NewRequest("POST", fmt.Sprintf("%s/ListAvailableProfiles", kiroRestAPIBase), strings.NewReader(`{"maxResults":10}`))
	if err != nil {
		return "", err
	}
	setKiroHeaders(req, account)
	req.Header.Set("Content-Type", "application/json")

	resp, err := GetRestClientForProxy(ResolveAccountProxyURL(account)).Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(body))
	}

	var result struct {
		Profiles []struct {
			Arn string `json:"arn"`
		} `json:"profiles"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}
	for _, profile := range result.Profiles {
		if profileArn := strings.TrimSpace(profile.Arn); profileArn != "" {
			return profileArn, nil
		}
	}
	return "", fmt.Errorf("empty profile list")
}

func withProfileArnQuery(rawURL string, account *config.Account) string {
	if account == nil {
		return rawURL
	}
	profileArn := strings.TrimSpace(account.ProfileArn)
	if profileArn == "" {
		return rawURL
	}
	return rawURL + "&profileArn=" + neturl.QueryEscape(profileArn)
}

func setKiroHeaders(req *http.Request, account *config.Account) {
	host := ""
	if req.URL != nil {
		host = req.URL.Host
	}
	headerValues := buildRuntimeHeaderValues(account, host)

	req.Header.Set("Accept", "application/json")
	applyKiroBaseHeaders(req, account, headerValues)
}

// RefreshAccountInfo 刷新账户信息（使用量、订阅等）
func RefreshAccountInfo(account *config.Account) (*config.AccountInfo, error) {
	info := &config.AccountInfo{
		LastRefresh: time.Now().Unix(),
	}

	// 在调 /getUsageLimits 之前确保 ProfileArn 已解析。Kiro IDE 的
	// GetUsageLimitsCommand 实际带 profileArn input；我们的实现把它放进
	// URL query (withProfileArnQuery)，但只有缓存命中时才会附加。
	// 对支持型账号（IDE supportsProfiles=true）若没缓存先抓一次，避免
	// 新导入账号第一次刷新就拿到不带 profileArn 的不准响应。
	// 不支持型(Builder ID 等)的 ErrProfileArnUnsupported 静默忽略，让请求
	// 裸发——AWS 服务端会返回这类账号能拿到的数据。
	if strings.TrimSpace(account.ProfileArn) == "" {
		if _, resolveErr := ResolveProfileArn(account); resolveErr != nil && !errors.Is(resolveErr, ErrProfileArnUnsupported) {
			// 5 分钟节流避免日志风暴
			if shouldLogProfileArnError(account.Email) {
				logger.Warnf("[RefreshAccountInfo] resolve profileArn for %s failed: %v (continuing with bare /getUsageLimits)", account.Email, resolveErr)
			}
		}
	}

	// 获取使用量和订阅信息
	usage, rawBody, err := GetUsageLimits(account)
	if err != nil {
		// 检测封禁状态
		errMsg := err.Error()
		if strings.Contains(errMsg, "TEMPORARILY_SUSPENDED") {
			// 账户被暂时封禁，自动禁用并标记封禁状态
			logger.Warnf("[RefreshAccountInfo] Account %s is temporarily suspended: %v", account.Email, err)

			// 更新账户封禁状态并自动禁用
			updatedAccount := *account
			updatedAccount.Enabled = false
			updatedAccount.BanStatus = "BANNED"
			updatedAccount.BanReason = "AWS temporarily suspended - unusual user activity detected"
			updatedAccount.BanTime = time.Now().Unix()

			// 保存更新后的账户状态
			if updateErr := config.UpdateAccount(account.ID, updatedAccount); updateErr != nil {
				logger.Errorf("[RefreshAccountInfo] Failed to update account ban status: %v", updateErr)
			}

			return nil, fmt.Errorf("Account suspended: %w", err)
		} else if strings.Contains(errMsg, "403") || strings.Contains(errMsg, "401") ||
			strings.Contains(errMsg, "invalid") || strings.Contains(errMsg, "expired") {
			// Token 相关错误，可能需要重新认证
			logger.Warnf("[RefreshAccountInfo] Authentication error for %s: %v", account.Email, err)

			// 更新账户封禁状态为认证失败并自动禁用
			updatedAccount := *account
			updatedAccount.Enabled = false
			updatedAccount.BanStatus = "BANNED"
			updatedAccount.BanReason = "Authentication failed - token invalid or expired"
			updatedAccount.BanTime = time.Now().Unix()

			// 保存更新后的账户状态
			if updateErr := config.UpdateAccount(account.ID, updatedAccount); updateErr != nil {
				logger.Errorf("[RefreshAccountInfo] Failed to update account ban status: %v", updateErr)
			}
		}

		return nil, fmt.Errorf("GetUsageLimits: %w", err)
	}

	// 如果成功获取信息，清除封禁状态（如果之前被标记）
	if account.BanStatus != "" && account.BanStatus != "ACTIVE" {
		logger.Infof("[RefreshAccountInfo] Account %s is now active, clearing ban status", account.Email)

		updatedAccount := *account
		updatedAccount.BanStatus = "ACTIVE"
		updatedAccount.BanReason = ""
		updatedAccount.BanTime = 0

		// 保存更新后的账户状态
		if updateErr := config.UpdateAccount(account.ID, updatedAccount); updateErr != nil {
			logger.Errorf("[RefreshAccountInfo] Failed to clear account ban status: %v", updateErr)
		}
	}

	// 解析用户信息（身份字段单独提取，用于 dedup 与展示）
	if usage.UserInfo != nil {
		info.Email = usage.UserInfo.Email
		info.UserId = usage.UserInfo.UserId
	}

	// 订阅信息仅用于日志诊断；所有用量/订阅/超额字段不再摊平，
	// 而是把完整响应原样存入 UsageData，由 pool / handler 按需解析，零字段丢失。
	if usage.SubscriptionInfo != nil {
		logger.Debugf("[RefreshAccountInfo] Subscription: type=%s, title=%s, name=%s",
			usage.SubscriptionInfo.SubscriptionType,
			usage.SubscriptionInfo.SubscriptionTitle,
			usage.SubscriptionInfo.SubscriptionName)
	}

	// 存储原始响应（含 overageConfiguration / overageCharges / *WithPrecision 等全部字段）
	info.UsageData = rawBody

	return info, nil
}

func parseSubscriptionType(raw string) string {
	upper := strings.ToUpper(raw)
	if strings.Contains(upper, "PRO_PLUS") || strings.Contains(upper, "PROPLUS") {
		return "PRO_PLUS"
	}
	if strings.Contains(upper, "POWER") {
		return "POWER"
	}
	if strings.Contains(upper, "PRO") {
		return "PRO"
	}
	return "FREE"
}

// 响应结构体
type UsageLimitsResponse struct {
	UsageBreakdownList   []UsageBreakdown      `json:"usageBreakdownList"`
	NextDateReset        json.RawMessage       `json:"nextDateReset"`
	SubscriptionInfo     *SubscriptionInfo     `json:"subscriptionInfo"`
	UserInfo             *UserInfo             `json:"userInfo"`
	OverageConfiguration *OverageConfiguration `json:"overageConfiguration"`
}

// OverageConfiguration is the user-level Overages switch state.
type OverageConfiguration struct {
	OverageStatus string `json:"overageStatus"` // "ENABLED" | "DISABLED"
}

type UsageBreakdown struct {
	ResourceType                 string         `json:"resourceType"` // real response: "CREDIT" (AGENTIC_REQUEST is only a request param)
	CurrentUsage                 float64        `json:"currentUsage"`
	CurrentUsageWithPrecision    float64        `json:"currentUsageWithPrecision"`
	UsageLimit                   float64        `json:"usageLimit"`
	UsageLimitWithPrecision      float64        `json:"usageLimitWithPrecision"`
	CurrentOverages              float64        `json:"currentOverages"`
	CurrentOveragesWithPrecision float64        `json:"currentOveragesWithPrecision"`
	OverageCap                   float64        `json:"overageCap"`
	OverageCapWithPrecision      float64        `json:"overageCapWithPrecision"`
	OverageCharges               float64        `json:"overageCharges"` // accrued USD = currentOverages × overageRate
	Currency                     string         `json:"currency"`
	Unit                         string         `json:"unit"`
	OverageRate                  float64        `json:"overageRate"`
	DisplayName                  string          `json:"displayName"`
	DisplayNamePlural            string          `json:"displayNamePlural"`
	NextDateReset                json.RawMessage `json:"nextDateReset"`
	FreeTrialInfo                *FreeTrialInfo  `json:"freeTrialInfo"`
	Bonuses                      []BonusInfo     `json:"bonuses"`
}

type FreeTrialInfo struct {
	CurrentUsage    float64         `json:"currentUsage"`
	UsageLimit      float64         `json:"usageLimit"`
	FreeTrialStatus string          `json:"freeTrialStatus"`
	FreeTrialExpiry json.RawMessage `json:"freeTrialExpiry"`
}

type BonusInfo struct {
	BonusCode    string          `json:"bonusCode"`
	DisplayName  string          `json:"displayName"`
	CurrentUsage float64         `json:"currentUsage"`
	UsageLimit   float64         `json:"usageLimit"`
	ExpiresAt    json.RawMessage `json:"expiresAt"`
	Status       string          `json:"status"`
}

type SubscriptionInfo struct {
	SubscriptionName             string `json:"subscriptionName"`
	SubscriptionTitle            string `json:"subscriptionTitle"`
	SubscriptionType             string `json:"subscriptionType"`
	Type                         string `json:"type"` // e.g. "Q_DEVELOPER_STANDALONE_PRO"
	Status                       string `json:"status"`
	UpgradeCapability            string `json:"upgradeCapability"`
	OverageCapability            string `json:"overageCapability"` // "OVERAGE_CAPABLE" or empty
	SubscriptionManagementTarget string `json:"subscriptionManagementTarget"`
}

type UserInfo struct {
	Email  string `json:"email"`
	UserId string `json:"userId"`
}

type UserInfoResponse struct {
	Email  string `json:"email"`
	UserId string `json:"userId"`
	Idp    string `json:"idp"`
	Status string `json:"status"`
}

type ModelInfo struct {
	ModelId        string   `json:"modelId"`
	ModelName      string   `json:"modelName"`
	Description    string   `json:"description"`
	InputTypes     []string `json:"supportedInputTypes"`
	RateMultiplier float64  `json:"rateMultiplier"`
	TokenLimits    *struct {
		MaxInputTokens  int `json:"maxInputTokens"`
		MaxOutputTokens int `json:"maxOutputTokens"`
	} `json:"tokenLimits"`
}
