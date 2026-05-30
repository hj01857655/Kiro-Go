// Package config provides configuration management for Kiro API Proxy.
//
// This package handles persistent storage and retrieval of:
//   - Account credentials and authentication tokens
//   - Server settings (port, host, API keys)
//   - Usage statistics and metrics
//   - Thinking mode configuration for AI responses
//
// All configuration is stored in a JSON file with thread-safe access
// via read-write mutex protection.
package config

import (
	"bufio"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"sync"
	"time"

	"golang.org/x/crypto/bcrypt"
)

// GenerateMachineId generates a UUID v4 format machine identifier.
// This ID is used to uniquely identify the proxy instance in Kiro API requests,
// helping with request tracking and rate limiting on the server side.
func GenerateMachineId() string {
	bytes := make([]byte, 16)
	rand.Read(bytes)
	bytes[6] = (bytes[6] & 0x0f) | 0x40 // 版本 4
	bytes[8] = (bytes[8] & 0x3f) | 0x80 // 变体
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		bytes[0:4], bytes[4:6], bytes[6:8], bytes[8:10], bytes[10:16])
}

// Account represents a Kiro API account with authentication credentials and usage statistics.
type Account struct {
	// Basic identification
	ID       string `json:"id"`                 // Unique account identifier (UUID)
	Email    string `json:"email,omitempty"`    // User email address
	UserId   string `json:"userId,omitempty"`   // Kiro user ID
	Nickname string `json:"nickname,omitempty"` // Display name for admin panel

	// Authentication credentials
	AccessToken  string `json:"accessToken"`            // OAuth access token for API calls
	RefreshToken string `json:"refreshToken"`           // OAuth refresh token for token renewal
	ClientID     string `json:"clientId,omitempty"`     // OIDC client ID (for IdC auth)
	ClientSecret string `json:"clientSecret,omitempty"` // OIDC client secret (for IdC auth)
	AuthMethod   string `json:"authMethod"`             // Authentication method: "idc" (AWS IdC) or "social" (GitHub/Google)
	Provider     string `json:"provider,omitempty"`     // Identity provider name (e.g., "BuilderId", "GitHub")
	Region       string `json:"region"`                 // AWS region for OIDC endpoints
	StartUrl     string `json:"startUrl,omitempty"`     // AWS SSO start URL
	ExpiresAt    int64  `json:"expiresAt,omitempty"`    // Token expiration timestamp (Unix seconds)
	MachineId    string `json:"machineId,omitempty"`    // UUID machine identifier for request tracking
	ProfileArn   string `json:"profileArn,omitempty"`   // CodeWhisperer/Kiro profile ARN for generation requests

	// Per-account outbound proxy (falls back to global ProxyURL if empty)
	ProxyURL string `json:"proxyURL,omitempty"`

	// Priority weight for load balancing (higher = more requests)
	Weight int `json:"weight,omitempty"` // 0 or 1 = normal, 2+ = higher priority

	// Account status
	Enabled   bool   `json:"enabled"`             // Whether account is active in the pool
	BanStatus string `json:"banStatus,omitempty"` // Ban status: "ACTIVE", "BANNED", "SUSPENDED"
	BanReason string `json:"banReason,omitempty"` // Reason for ban/suspension
	BanTime   int64  `json:"banTime,omitempty"`   // Timestamp when ban was detected

	// Usage & subscription data.
	// The complete /getUsageLimits response is stored verbatim as raw JSON so no
	// upstream field is ever lost (subscription, usage, trial, overage charges).
	// Consumers parse what they need on demand:
	//   - pool dispatch  → parseUsageFromData (usage limit + overageConfiguration)
	//   - admin handlers → parseUsageData     (full breakdown for the UI)
	// Both /getUsageLimits endpoints (codewhisperer + q.us-east-1) return the
	// same schema: {nextDateReset, overageConfiguration, subscriptionInfo,
	// usageBreakdownList, userInfo}.
	UsageData   json.RawMessage `json:"usageData,omitempty"`   // Raw /getUsageLimits response
	LastRefresh int64           `json:"lastRefresh,omitempty"` // Last info refresh timestamp (Unix seconds)

	// Runtime statistics (updated during operation)
	RequestCount int     `json:"requestCount,omitempty"` // Total requests processed
	ErrorCount   int     `json:"errorCount,omitempty"`   // Total errors encountered
	LastUsed     int64   `json:"lastUsed,omitempty"`     // Last request timestamp
	TotalTokens  int     `json:"totalTokens,omitempty"`  // Cumulative tokens processed
	TotalCredits float64 `json:"totalCredits,omitempty"` // Cumulative credits consumed
}

// PromptFilterRule defines a single custom prompt sanitization rule.
// Type can be: "regex" (regexp find/replace within prompt) or
// "lines-containing" (remove lines containing the match substring).
type PromptFilterRule struct {
	ID      string `json:"id"`                // Unique rule identifier
	Name    string `json:"name"`              // Human-readable rule name
	Type    string `json:"type"`              // "regex" or "lines-containing"
	Match   string `json:"match"`             // Pattern to match (regex pattern or substring)
	Replace string `json:"replace,omitempty"` // Replacement string (only for regex; empty = delete match)
	Enabled bool   `json:"enabled"`           // Whether this rule is active
}

// ApiKeyEntry represents a single API key with optional usage limits and counters.
// Limits with value 0 are treated as "no limit". Counters are cumulative and never reset
// automatically; operators can use the admin endpoint to manually reset them.
type ApiKeyEntry struct {
	ID         string `json:"id"`                 // Unique identifier (UUID)
	Name       string `json:"name,omitempty"`     // Human-readable label
	Key        string `json:"key"`                // The actual key value clients send
	Enabled    bool   `json:"enabled"`            // Whether this key may authenticate
	Migrated   bool   `json:"migrated,omitempty"` // True if migrated from legacy single ApiKey field
	CreatedAt  int64  `json:"createdAt"`          // Creation timestamp (Unix seconds)
	LastUsedAt int64  `json:"lastUsedAt,omitempty"`

	// Limits (0 = unlimited)
	TokenLimit  int64   `json:"tokenLimit,omitempty"`
	CreditLimit float64 `json:"creditLimit,omitempty"`

	// Cumulative usage (never auto-reset)
	TokensUsed    int64   `json:"tokensUsed,omitempty"`
	CreditsUsed   float64 `json:"creditsUsed,omitempty"`
	RequestsCount int64   `json:"requestsCount,omitempty"`
}

// Config represents the global application configuration.
type Config struct {
	// Server settings
	Password      string        `json:"password"`          // Admin panel password
	Port          int           `json:"port"`              // HTTP server port (default: 8080)
	Host          string        `json:"host"`              // HTTP server bind address (default: 127.0.0.1, set to 0.0.0.0 for container exposure)
	ApiKey        string        `json:"apiKey,omitempty"`  // [Deprecated] Legacy single API key, migrated into ApiKeys on first load
	RequireApiKey bool          `json:"requireApiKey"`     // [Deprecated] Whether to enforce API key validation; with multi-key support, len(ApiKeys)>0 implicitly enforces auth
	ApiKeys       []ApiKeyEntry `json:"apiKeys,omitempty"` // Multiple API keys, each with independent quota
	KiroVersion   string        `json:"kiroVersion,omitempty"`
	SystemVersion string        `json:"systemVersion,omitempty"`
	NodeVersion   string        `json:"nodeVersion,omitempty"`
	Accounts      []Account     `json:"accounts"` // Registered Kiro accounts

	// Thinking mode configuration for extended reasoning output
	ThinkingSuffix       string `json:"thinkingSuffix,omitempty"`       // Model suffix to trigger thinking mode (default: "-thinking")
	OpenAIThinkingFormat string `json:"openaiThinkingFormat,omitempty"` // OpenAI output format: "reasoning_content", "thinking", or "think"
	ClaudeThinkingFormat string `json:"claudeThinkingFormat,omitempty"` // Claude output format: "reasoning_content", "thinking", or "think"

	// Endpoint configuration: "auto", "kiro", "codewhisperer", or "amazonq"
	PreferredEndpoint string `json:"preferredEndpoint,omitempty"`

	// EndpointFallback controls whether to try other endpoints when the preferred one fails.
	// Defaults to true. Set to false to only use the preferred endpoint.
	EndpointFallback *bool `json:"endpointFallback,omitempty"`

	// AllowOverUsage allows accounts to continue serving requests even when their
	// usage quota has been exhausted. When enabled, the pool will not skip accounts
	// solely because usageCurrent >= usageLimit.
	AllowOverUsage bool `json:"allowOverUsage,omitempty"`

	// Proxy configuration: optional outbound proxy for Kiro API requests
	// Format: "socks5://host:port", "socks5://user:pass@host:port",
	//         "http://host:port",  "http://user:pass@host:port"
	// Leave empty to connect directly.
	ProxyURL string `json:"proxyURL,omitempty"`

	// SanitizeClaudeCodePrompt is kept for backward-compatible JSON loading only.
	// Migrated to FilterClaudeCode on first load. Do not use directly.
	SanitizeClaudeCodePrompt bool `json:"sanitizeClaudeCodePrompt,omitempty"`

	// FilterClaudeCode detects the Claude Code CLI built-in system prompt and replaces it
	// with a compact backend-only prompt, reducing token usage significantly.
	FilterClaudeCode bool `json:"filterClaudeCode,omitempty"`

	// FilterEnvNoise strips environment metadata lines from system prompts:
	// git status, recent commits, environment sections, fast_mode_info tags, etc.
	FilterEnvNoise bool `json:"filterEnvNoise,omitempty"`

	// FilterStripBoundaries removes --- SYSTEM PROMPT --- / --- END SYSTEM PROMPT --- markers.
	FilterStripBoundaries bool `json:"filterStripBoundaries,omitempty"`

	// PromptFilterRules is a list of user-defined prompt sanitization rules (regex or line-filter).
	PromptFilterRules []PromptFilterRule `json:"promptFilterRules,omitempty"`

	// LogLevel controls verbosity of application logs.
	// Accepted values: "debug", "info", "warn", "error". Defaults to "info".
	// Can be overridden by the LOG_LEVEL environment variable.
	LogLevel string `json:"logLevel,omitempty"`

	// Global statistics (persisted across restarts)
	TotalRequests   int     `json:"totalRequests,omitempty"`   // Total API requests received
	SuccessRequests int     `json:"successRequests,omitempty"` // Successful requests count
	FailedRequests  int     `json:"failedRequests,omitempty"`  // Failed requests count
	TotalTokens     int     `json:"totalTokens,omitempty"`     // Total tokens processed
	TotalCredits    float64 `json:"totalCredits,omitempty"`    // Total credits consumed
}

// AccountInfo contains account metadata retrieved from Kiro API.
// Used for updating an account after a /getUsageLimits refresh. The complete
// upstream response is carried verbatim in UsageData; consumers parse fields on
// demand (no flattening, so no upstream field is lost).
type AccountInfo struct {
	Email       string
	UserId      string
	LastRefresh int64
	UsageData   json.RawMessage // Raw /getUsageLimits response (JSON)
}

// Version current version
const Version = "1.1.1"

var (
	cfg     *Config
	cfgLock sync.RWMutex
	cfgPath string

	// Log file paths, derived from the config directory in Init.
	auditLogPath    string
	requestLogPath  string
	upstreamLogPath string
)

// Init initializes the configuration system with the specified file path.
// If the file doesn't exist, a default configuration is created.
func Init(path string) error {
	cfgPath = path
	// Audit and request logs live alongside the config file.
	dir := filepath.Dir(path)
	auditLogPath = filepath.Join(dir, "audit.log")
	requestLogPath = filepath.Join(dir, "request.log")
	upstreamLogPath = filepath.Join(dir, "upstream.log")
	return Load()
}

func Load() error {
	cfgLock.Lock()
	defer cfgLock.Unlock()

	data, err := os.ReadFile(cfgPath)
	if err != nil {
		if os.IsNotExist(err) {
			// Create default configuration.
			// Binds to 127.0.0.1 by default (local only) for safety; set host
			// explicitly (config or env) to 0.0.0.0 for Docker/container exposure.
			cfg = &Config{
				Password:      "changeme",
				Port:          8080,
				Host:          "127.0.0.1",
				RequireApiKey: false,
				Accounts:      []Account{},
			}
			return saveLocked()
		}
		return err
	}

	var c Config
	if err := json.Unmarshal(data, &c); err != nil {
		return err
	}
	cfg = &c

	// Migration: if a legacy single ApiKey is present and the new ApiKeys list is empty,
	// promote it into the new structure. The migrated entry inherits the legacy
	// RequireApiKey state — if the legacy deployment was public (RequireApiKey=false),
	// we mark the entry disabled so it doesn't accidentally start enforcing auth.
	// Operators can flip it on later from the admin UI. The legacy field is kept
	// for backward compatibility when reading older config files.
	if cfg.ApiKey != "" && len(cfg.ApiKeys) == 0 {
		cfg.ApiKeys = append(cfg.ApiKeys, ApiKeyEntry{
			ID:        newUUID(),
			Name:      "legacy",
			Key:       cfg.ApiKey,
			Enabled:   cfg.RequireApiKey,
			Migrated:  true,
			CreatedAt: time.Now().Unix(),
		})
		if err := saveLocked(); err != nil {
			return err
		}
	}

	return nil
}

// saveLocked persists cfg to disk. Caller MUST already hold cfgLock.
// This is identical to Save() (which does not take the lock either) but is named
// distinctly so call sites that already hold cfgLock are explicit about it.
func saveLocked() error {
	return Save()
}

// newUUID returns a UUID v4 string. Defined here to avoid pulling extra deps in this file.
func newUUID() string {
	return GenerateMachineId()
}

// Save persists the current configuration to the JSON file.
// Uses indented formatting for human readability.
func Save() error {
	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(cfgPath, data, 0600)
}

// SetPassword updates the admin password, storing it as a bcrypt hash.
// An empty password is stored as-is (no auth). Primarily used for environment
// variable override in containerized deployments and admin password changes.
func SetPassword(password string) error {
	if password == "" {
		cfgLock.Lock()
		defer cfgLock.Unlock()
		cfg.Password = ""
		return nil
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	cfgLock.Lock()
	defer cfgLock.Unlock()
	cfg.Password = string(hash)
	return nil
}

// VerifyPassword checks if the provided password matches the stored hash.
// Supports bcrypt hashes and transparently migrates legacy plaintext passwords
// to bcrypt on first successful match.
func VerifyPassword(password string) bool {
	cfgLock.RLock()
	storedHash := cfg.Password
	cfgLock.RUnlock()

	if storedHash == "" {
		return password == ""
	}

	// bcrypt hashes start with $2a$, $2b$, or $2y$
	if len(storedHash) > 4 && storedHash[0] == '$' && storedHash[1] == '2' {
		err := bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(password))
		return err == nil
	}

	// Legacy plaintext comparison - migrate to bcrypt hash on success
	if storedHash == password {
		go func() {
			if err := SetPassword(password); err == nil {
				Save()
			}
		}()
		return true
	}

	return false
}

// GetConfigDir returns the directory containing the config JSON file.
// Useful for sibling state (e.g. stored Responses, caches) that should live
// alongside the configuration file.
func GetConfigDir() string {
	cfgLock.RLock()
	defer cfgLock.RUnlock()
	if cfgPath == "" {
		return "."
	}
	dir := cfgPath
	for i := len(dir) - 1; i >= 0; i-- {
		if dir[i] == '/' || dir[i] == '\\' {
			return dir[:i]
		}
	}
	return "."
}

func Get() *Config {
	cfgLock.RLock()
	defer cfgLock.RUnlock()
	return cfg
}

func GetPassword() string {
	cfgLock.RLock()
	defer cfgLock.RUnlock()
	return cfg.Password
}

func GetPort() int {
	cfgLock.RLock()
	defer cfgLock.RUnlock()
	if cfg.Port == 0 {
		return 8080
	}
	return cfg.Port
}

func GetHost() string {
	cfgLock.RLock()
	defer cfgLock.RUnlock()
	if cfg.Host == "" {
		return "127.0.0.1"
	}
	return cfg.Host
}

func GetAccounts() []Account {
	cfgLock.RLock()
	defer cfgLock.RUnlock()
	accounts := make([]Account, len(cfg.Accounts))
	copy(accounts, cfg.Accounts)
	return accounts
}

func GetEnabledAccounts() []Account {
	cfgLock.RLock()
	defer cfgLock.RUnlock()
	var accounts []Account
	for _, a := range cfg.Accounts {
		if a.Enabled {
			accounts = append(accounts, a)
		}
	}
	return accounts
}

// AddAccount adds a new account, or refreshes an existing one when an account
// with the same server-assigned UserId already exists (dedupe). Re-importing
// fresh credentials for a known user updates that account in place instead of
// creating a duplicate, and revives a previously banned/disabled account.
//
// Note: 此函数为兼容性签名。需要拿到去重后真实账号(尤其 dedup 命中时 ID 会
// 变成已存在那条的 ID)的调用方应使用 AddAccountReturning。
func AddAccount(account Account) error {
	_, err := AddAccountReturning(account)
	return err
}

// AddAccountReturning is the same as AddAccount but returns the saved Account
// (with the actual stored ID, which differs from the input when dedup hits).
// 用于 handler 把"真实账号 ID"返回给前端，避免 dedup 时返回不存在的临时 ID。
func AddAccountReturning(account Account) (Account, error) {
	cfgLock.Lock()
	defer cfgLock.Unlock()

	if account.UserId != "" {
		for i, a := range cfg.Accounts {
			if a.UserId == account.UserId {
				existing := cfg.Accounts[i]
				// Refresh credentials and connection settings.
				existing.AccessToken = account.AccessToken
				existing.RefreshToken = account.RefreshToken
				existing.ClientID = account.ClientID
				existing.ClientSecret = account.ClientSecret
				existing.ExpiresAt = account.ExpiresAt
				existing.Region = account.Region
				if account.Email != "" {
					existing.Email = account.Email
				}
				if account.AuthMethod != "" {
					existing.AuthMethod = account.AuthMethod
				}
				if account.Provider != "" {
					existing.Provider = account.Provider
				}
				if account.StartUrl != "" {
					existing.StartUrl = account.StartUrl
				}
				if account.ProfileArn != "" {
					existing.ProfileArn = account.ProfileArn
				}
				if account.MachineId != "" && existing.MachineId == "" {
					existing.MachineId = account.MachineId
				}
				if account.Nickname != "" {
					existing.Nickname = account.Nickname
				}
				// Re-importing fresh credentials revives the account.
				existing.Enabled = account.Enabled
				existing.BanStatus = ""
				existing.BanReason = ""
				existing.BanTime = 0
				cfg.Accounts[i] = existing
				return existing, Save()
			}
		}
	}

	cfg.Accounts = append(cfg.Accounts, account)
	return account, Save()
}

func UpdateAccount(id string, account Account) error {
	cfgLock.Lock()
	defer cfgLock.Unlock()
	for i, a := range cfg.Accounts {
		if a.ID == id {
			cfg.Accounts[i] = account
			return Save()
		}
	}
	return nil
}

// UpdateAccountUsageData persists the raw /getUsageLimits response for an account.
// Called after a successful setUserPreference or getUsageLimits round-trip so the
// overage switch state and charges stay in sync. Empty data is a no-op (so a
// failed fetch never wipes previously-stored usage). Also bumps LastRefresh.
func UpdateAccountUsageData(id string, usageData json.RawMessage) error {
	if len(usageData) == 0 {
		return nil
	}
	cfgLock.Lock()
	defer cfgLock.Unlock()
	for i, a := range cfg.Accounts {
		if a.ID == id {
			cfg.Accounts[i].UsageData = usageData
			cfg.Accounts[i].LastRefresh = time.Now().Unix()
			return Save()
		}
	}
	return nil
}

// SetAccountEnabled toggles the enabled state of an account and persists the change.
// Used to disable accounts whose refresh token has been revoked (401 Bad credentials)
// so subsequent requests skip them automatically.
func SetAccountEnabled(id string, enabled bool) error {
	cfgLock.Lock()
	defer cfgLock.Unlock()
	for i, a := range cfg.Accounts {
		if a.ID == id {
			cfg.Accounts[i].Enabled = enabled
			if !enabled {
				cfg.Accounts[i].BanStatus = "DISABLED"
				cfg.Accounts[i].BanTime = time.Now().Unix()
			}
			return Save()
		}
	}
	return nil
}

// SetAccountBanStatus marks an account as banned/disabled with a reason.
// Reason is recorded so operators can see why the account was auto-disabled.
func SetAccountBanStatus(id, status, reason string) error {
	cfgLock.Lock()
	defer cfgLock.Unlock()
	for i, a := range cfg.Accounts {
		if a.ID == id {
			cfg.Accounts[i].BanStatus = status
			cfg.Accounts[i].BanReason = reason
			cfg.Accounts[i].BanTime = time.Now().Unix()
			if status == "BANNED" || status == "DISABLED" {
				cfg.Accounts[i].Enabled = false
			}
			return Save()
		}
	}
	return nil
}

func UpdateAccountProfileArn(id, profileArn string) error {
	cfgLock.Lock()
	defer cfgLock.Unlock()
	for i, a := range cfg.Accounts {
		if a.ID == id {
			cfg.Accounts[i].ProfileArn = profileArn
			return Save()
		}
	}
	return nil
}

func DeleteAccount(id string) error {
	cfgLock.Lock()
	defer cfgLock.Unlock()
	for i, a := range cfg.Accounts {
		if a.ID == id {
			cfg.Accounts = append(cfg.Accounts[:i], cfg.Accounts[i+1:]...)
			return Save()
		}
	}
	return nil
}

func UpdateAccountToken(id, accessToken, refreshToken string, expiresAt int64) error {
	cfgLock.Lock()
	defer cfgLock.Unlock()
	for i, a := range cfg.Accounts {
		if a.ID == id {
			cfg.Accounts[i].AccessToken = accessToken
			if refreshToken != "" {
				cfg.Accounts[i].RefreshToken = refreshToken
			}
			cfg.Accounts[i].ExpiresAt = expiresAt
			return Save()
		}
	}
	return nil
}

func GetApiKey() string {
	cfgLock.RLock()
	defer cfgLock.RUnlock()
	return cfg.ApiKey
}

func IsApiKeyRequired() bool {
	cfgLock.RLock()
	defer cfgLock.RUnlock()
	return cfg.RequireApiKey
}

func UpdateSettings(apiKey string, requireApiKey bool, password string) error {
	cfgLock.Lock()
	defer cfgLock.Unlock()
	cfg.ApiKey = apiKey
	cfg.RequireApiKey = requireApiKey
	if password != "" {
		hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err != nil {
			return err
		}
		cfg.Password = string(hash)
	}
	return Save()
}

func UpdateSettingsPatch(apiKey *string, requireApiKey *bool, password string, host *string, port *int) error {
	cfgLock.Lock()
	defer cfgLock.Unlock()
	if apiKey != nil {
		cfg.ApiKey = *apiKey
	}
	if requireApiKey != nil {
		cfg.RequireApiKey = *requireApiKey
	}
	if password != "" {
		hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err != nil {
			return err
		}
		cfg.Password = string(hash)
	}
	if host != nil && *host != "" {
		cfg.Host = *host
	}
	if port != nil && *port > 0 && *port <= 65535 {
		cfg.Port = *port
	}
	return Save()
}

func UpdateStats(totalReq, successReq, failedReq, totalTokens int, totalCredits float64) error {
	cfgLock.Lock()
	defer cfgLock.Unlock()
	cfg.TotalRequests = totalReq
	cfg.SuccessRequests = successReq
	cfg.FailedRequests = failedReq
	cfg.TotalTokens = totalTokens
	cfg.TotalCredits = totalCredits
	return Save()
}

func GetStats() (int, int, int, int, float64) {
	cfgLock.RLock()
	defer cfgLock.RUnlock()
	return cfg.TotalRequests, cfg.SuccessRequests, cfg.FailedRequests, cfg.TotalTokens, cfg.TotalCredits
}

func UpdateAccountStats(id string, requestCount, errorCount, totalTokens int, totalCredits float64, lastUsed int64) error {
	cfgLock.Lock()
	defer cfgLock.Unlock()
	for i, a := range cfg.Accounts {
		if a.ID == id {
			cfg.Accounts[i].RequestCount = requestCount
			cfg.Accounts[i].ErrorCount = errorCount
			cfg.Accounts[i].TotalTokens = totalTokens
			cfg.Accounts[i].TotalCredits = totalCredits
			cfg.Accounts[i].LastUsed = lastUsed
			return Save()
		}
	}
	return nil
}

// UpdateAccountInfo updates an account's subscription and usage information.
// Called after refreshing account data from Kiro API. The complete upstream
// response is stored verbatim in UsageData (no flattening); identity fields are
// only overwritten when non-empty so a partial refresh never clobbers them.
func UpdateAccountInfo(id string, info AccountInfo) error {
	cfgLock.Lock()
	defer cfgLock.Unlock()
	for i, a := range cfg.Accounts {
		if a.ID == id {
			if info.Email != "" {
				cfg.Accounts[i].Email = info.Email
			}
			if info.UserId != "" {
				cfg.Accounts[i].UserId = info.UserId
			}
			if len(info.UsageData) > 0 {
				cfg.Accounts[i].UsageData = info.UsageData
			}
			if info.LastRefresh > 0 {
				cfg.Accounts[i].LastRefresh = info.LastRefresh
			}
			return Save()
		}
	}
	return nil
}

// GetFilterClaudeCode returns whether Claude Code system prompt detection is enabled.
// Also checks the legacy SanitizeClaudeCodePrompt flag for backward compatibility.
func GetFilterClaudeCode() bool {
	cfgLock.RLock()
	defer cfgLock.RUnlock()
	if cfg == nil {
		return false
	}
	return cfg.FilterClaudeCode || cfg.SanitizeClaudeCodePrompt
}

// GetFilterEnvNoise returns whether environment noise line stripping is enabled.
func GetFilterEnvNoise() bool {
	cfgLock.RLock()
	defer cfgLock.RUnlock()
	if cfg == nil {
		return false
	}
	return cfg.FilterEnvNoise
}

// GetFilterStripBoundaries returns whether boundary marker stripping is enabled.
func GetFilterStripBoundaries() bool {
	cfgLock.RLock()
	defer cfgLock.RUnlock()
	if cfg == nil {
		return false
	}
	return cfg.FilterStripBoundaries
}

// PromptFilterConfig holds all prompt filter settings for API responses.
type PromptFilterConfig struct {
	FilterClaudeCode      bool               `json:"filterClaudeCode"`
	FilterEnvNoise        bool               `json:"filterEnvNoise"`
	FilterStripBoundaries bool               `json:"filterStripBoundaries"`
	Rules                 []PromptFilterRule `json:"rules"`
}

// GetPromptFilterConfig returns all prompt filter settings.
func GetPromptFilterConfig() PromptFilterConfig {
	cfgLock.RLock()
	defer cfgLock.RUnlock()
	if cfg == nil {
		return PromptFilterConfig{Rules: []PromptFilterRule{}}
	}
	rules := make([]PromptFilterRule, len(cfg.PromptFilterRules))
	copy(rules, cfg.PromptFilterRules)
	return PromptFilterConfig{
		FilterClaudeCode:      cfg.FilterClaudeCode || cfg.SanitizeClaudeCodePrompt,
		FilterEnvNoise:        cfg.FilterEnvNoise,
		FilterStripBoundaries: cfg.FilterStripBoundaries,
		Rules:                 rules,
	}
}

// UpdatePromptFilterConfig saves all prompt filter settings atomically.
func UpdatePromptFilterConfig(filterClaudeCode, filterEnvNoise, filterStripBoundaries bool, rules []PromptFilterRule) error {
	cfgLock.Lock()
	defer cfgLock.Unlock()
	cfg.FilterClaudeCode = filterClaudeCode
	cfg.FilterEnvNoise = filterEnvNoise
	cfg.FilterStripBoundaries = filterStripBoundaries
	// Clear legacy flag to avoid double-applying after first save
	cfg.SanitizeClaudeCodePrompt = false
	if rules != nil {
		cfg.PromptFilterRules = rules
	}
	return Save()
}

// GetPromptFilterRules returns the current prompt filter rules.
func GetPromptFilterRules() []PromptFilterRule {
	cfgLock.RLock()
	defer cfgLock.RUnlock()
	if cfg == nil {
		return nil
	}
	rules := make([]PromptFilterRule, len(cfg.PromptFilterRules))
	copy(rules, cfg.PromptFilterRules)
	return rules
}

// ThinkingConfig holds settings for AI thinking/reasoning mode.
// When enabled, models output their reasoning process alongside the response.
type ThinkingConfig struct {
	Suffix       string `json:"suffix"`       // Model name suffix that triggers thinking mode
	OpenAIFormat string `json:"openaiFormat"` // Output format for OpenAI-compatible responses
	ClaudeFormat string `json:"claudeFormat"` // Output format for Claude-compatible responses
}

// GetThinkingConfig 获取 thinking 配置
func GetThinkingConfig() ThinkingConfig {
	cfgLock.RLock()
	defer cfgLock.RUnlock()

	suffix := cfg.ThinkingSuffix
	if suffix == "" {
		suffix = "-thinking"
	}
	openaiFormat := cfg.OpenAIThinkingFormat
	if openaiFormat == "" {
		openaiFormat = "reasoning_content"
	}
	claudeFormat := cfg.ClaudeThinkingFormat
	if claudeFormat == "" {
		claudeFormat = "thinking"
	}

	return ThinkingConfig{
		Suffix:       suffix,
		OpenAIFormat: openaiFormat,
		ClaudeFormat: claudeFormat,
	}
}

// UpdateThinkingConfig 更新 thinking 配置
func UpdateThinkingConfig(suffix, openaiFormat, claudeFormat string) error {
	cfgLock.Lock()
	defer cfgLock.Unlock()
	cfg.ThinkingSuffix = suffix
	cfg.OpenAIThinkingFormat = openaiFormat
	cfg.ClaudeThinkingFormat = claudeFormat
	return Save()
}

// GetPreferredEndpoint 获取首选端点配置
func GetPreferredEndpoint() string {
	cfgLock.RLock()
	defer cfgLock.RUnlock()
	if cfg.PreferredEndpoint == "" {
		return "auto"
	}
	return cfg.PreferredEndpoint
}

// UpdatePreferredEndpoint 更新首选端点配置
func UpdatePreferredEndpoint(endpoint string) error {
	cfgLock.Lock()
	defer cfgLock.Unlock()
	cfg.PreferredEndpoint = endpoint
	return Save()
}

// GetEndpointFallback returns whether endpoint fallback is enabled. Defaults to true.
func GetEndpointFallback() bool {
	cfgLock.RLock()
	defer cfgLock.RUnlock()
	if cfg.EndpointFallback == nil {
		return true
	}
	return *cfg.EndpointFallback
}

// UpdateEndpointFallback sets the endpoint fallback switch and persists the change.
func UpdateEndpointFallback(enabled bool) error {
	cfgLock.Lock()
	defer cfgLock.Unlock()
	cfg.EndpointFallback = &enabled
	return Save()
}

// GetProxyURL 获取出站代理地址
func GetProxyURL() string {
	cfgLock.RLock()
	defer cfgLock.RUnlock()
	return cfg.ProxyURL
}

// UpdateProxySettings 更新出站代理配置
func UpdateProxySettings(proxyURL string) error {
	cfgLock.Lock()
	defer cfgLock.Unlock()
	cfg.ProxyURL = proxyURL
	return Save()
}

// GetAllowOverUsage returns whether over-usage is allowed when account quota is exhausted.
func GetAllowOverUsage() bool {
	cfgLock.RLock()
	defer cfgLock.RUnlock()
	if cfg == nil {
		return false
	}
	return cfg.AllowOverUsage
}

// UpdateAllowOverUsage sets the over-usage setting and persists the change.
func UpdateAllowOverUsage(allow bool) error {
	cfgLock.Lock()
	defer cfgLock.Unlock()
	cfg.AllowOverUsage = allow
	return Save()
}

// GetLogLevel returns the configured log level (debug/info/warn/error). Defaults to "info".
func GetLogLevel() string {
	cfgLock.RLock()
	defer cfgLock.RUnlock()
	if cfg == nil || cfg.LogLevel == "" {
		return "info"
	}
	return cfg.LogLevel
}

// UpdateLogLevel updates the log level setting and persists the change.
func UpdateLogLevel(level string) error {
	cfgLock.Lock()
	defer cfgLock.Unlock()
	cfg.LogLevel = level
	return Save()
}

type KiroClientConfig struct {
	KiroVersion   string
	SystemVersion string
	NodeVersion   string
}

func GetKiroClientConfig() KiroClientConfig {
	cfgLock.RLock()
	defer cfgLock.RUnlock()

	kiroVersion := "0.11.107"
	if cfg != nil && cfg.KiroVersion != "" {
		kiroVersion = cfg.KiroVersion
	}

	systemVersion := ""
	if cfg != nil {
		systemVersion = cfg.SystemVersion
	}
	if systemVersion == "" {
		systemVersion = defaultSystemVersion()
	}

	nodeVersion := "22.22.0"
	if cfg != nil && cfg.NodeVersion != "" {
		nodeVersion = cfg.NodeVersion
	}

	return KiroClientConfig{
		KiroVersion:   kiroVersion,
		SystemVersion: systemVersion,
		NodeVersion:   nodeVersion,
	}
}

func defaultSystemVersion() string {
	switch runtime.GOOS {
	case "windows":
		return "win32#10.0.22631"
	case "darwin":
		return "darwin#24.6.0"
	default:
		return "linux#6.6.87"
	}
}

// ==================== Audit Logs Management ====================

// AuditLog represents a single audit log entry for tracking administrative actions.
type AuditLog struct {
	ID        string                 `json:"id"`                  // Unique log entry identifier (UUID)
	Timestamp int64                  `json:"timestamp"`           // Unix timestamp when action occurred
	Action    string                 `json:"action"`              // Action type: account.create, account.update, etc.
	Level     string                 `json:"level"`               // Log level: info, warning, error
	User      string                 `json:"user,omitempty"`      // User who performed the action (admin/system)
	Message   string                 `json:"message"`             // Human-readable description
	Target    string                 `json:"target,omitempty"`    // Target resource (account email, key name, etc.)
	IPAddress string                 `json:"ipAddress,omitempty"` // IP address of the request
	UserAgent string                 `json:"userAgent,omitempty"` // User agent string
	Changes   map[string]interface{} `json:"changes,omitempty"`   // Before/after values for updates
	Metadata  map[string]interface{} `json:"metadata,omitempty"`  // Additional context data
}

// RequestLog represents a single API request log entry.
type RequestLog struct {
	ID                       string `json:"id"`                                 // Unique log entry identifier (UUID)
	Timestamp                int64  `json:"timestamp"`                          // Unix timestamp (ms) when request occurred
	Method                   string `json:"method"`                             // HTTP method (POST)
	Path                     string `json:"path"`                               // Request path (/v1/messages or /v1/chat/completions)
	Model                    string `json:"model"`                              // Model name requested
	AccountEmail             string `json:"accountEmail,omitempty"`             // Account email used for the request
	StatusCode               int    `json:"statusCode"`                         // HTTP status code
	Success                  bool   `json:"success"`                            // Whether request succeeded
	ErrorMessage             string `json:"errorMessage,omitempty"`             // Error message if failed
	InputTokens              int    `json:"inputTokens,omitempty"`              // Input tokens count
	OutputTokens             int    `json:"outputTokens,omitempty"`             // Output tokens count
	CacheCreationInputTokens int    `json:"cacheCreationInputTokens,omitempty"` // Cache creation tokens
	CacheReadInputTokens     int    `json:"cacheReadInputTokens,omitempty"`     // Cache read tokens
	Duration                 int64  `json:"duration"`                           // Request duration in milliseconds
	IPAddress                string `json:"ipAddress,omitempty"`                // Client IP address
	UserAgent                string `json:"userAgent,omitempty"`                // User agent string
	Stream                   bool   `json:"stream"`                             // Whether request was streaming
}

// GetAuditLogs returns audit logs from file (up to 1000 most recent, newest-first).
func GetAuditLogs() []AuditLog {
	file, err := os.Open(auditLogPath)
	if err != nil {
		return []AuditLog{}
	}
	defer file.Close()

	var logs []AuditLog
	scanner := bufio.NewScanner(file)
	scanner.Buffer(make([]byte, 0, 64*1024), 4*1024*1024)
	for scanner.Scan() {
		var log AuditLog
		if err := json.Unmarshal(scanner.Bytes(), &log); err == nil {
			logs = append(logs, log)
		}
	}

	const maxLogs = 1000
	if len(logs) > maxLogs {
		logs = logs[len(logs)-maxLogs:]
	}
	// Reverse so the newest entries come first.
	for i, j := 0, len(logs)-1; i < j; i, j = i+1, j-1 {
		logs[i], logs[j] = logs[j], logs[i]
	}
	return logs
}

// AddAuditLog appends a new audit log entry to the audit.log file.
func AddAuditLog(log AuditLog) error {
	if log.ID == "" {
		log.ID = GenerateMachineId()
	}
	if log.Timestamp == 0 {
		log.Timestamp = time.Now().UnixMilli()
	}

	file, err := os.OpenFile(auditLogPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0600)
	if err != nil {
		return err
	}
	defer file.Close()

	data, err := json.Marshal(log)
	if err != nil {
		return err
	}
	_, err = file.Write(append(data, '\n'))
	return err
}

// ClearAuditLogs removes the audit log file.
func ClearAuditLogs() error {
	if err := os.Remove(auditLogPath); err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}

// ==================== System Log Sink ====================
//
// AddSystemLog bridges the logger package's runtime output (INFO/WARN/ERROR)
// into the same store the admin "Global Logs" panel reads, so operators see
// backend runtime logs alongside management-audit entries.
//
// Writes are asynchronous and bounded: a background goroutine drains a buffered
// channel and appends to audit.log. If the buffer is full (e.g. a burst of
// logging), new entries are dropped rather than blocking the caller — logging
// must never stall the proxy request hot path.

const systemLogBuffer = 512

var (
	systemLogCh   chan AuditLog
	systemLogOnce sync.Once
)

func startSystemLogWorker() {
	systemLogOnce.Do(func() {
		systemLogCh = make(chan AuditLog, systemLogBuffer)
		go func() {
			for entry := range systemLogCh {
				_ = AddAuditLog(entry)
			}
		}()
	})
}

// AddSystemLog records a runtime log line (from the logger package) into the
// shared log store. level is "debug" | "info" | "warning" | "error".
// Non-blocking: drops the entry if the async buffer is full.
func AddSystemLog(level, message string) {
	startSystemLogWorker()
	entry := AuditLog{
		Timestamp: time.Now().UnixMilli(),
		Action:    "system.log",
		Level:     level,
		User:      "system",
		Message:   message,
	}
	select {
	case systemLogCh <- entry:
	default:
		// buffer full — drop to avoid blocking the logging caller
	}
}

// ==================== Request Logs Management ====================

// GetRequestLogs reads request logs from request.log and returns them
// newest-first (up to the 10000 most recent entries).
func GetRequestLogs() []RequestLog {
	var logs []RequestLog
	file, err := os.Open(requestLogPath)
	if err != nil {
		return logs
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	scanner.Buffer(make([]byte, 0, 64*1024), 4*1024*1024)
	for scanner.Scan() {
		var log RequestLog
		if err := json.Unmarshal(scanner.Bytes(), &log); err == nil {
			logs = append(logs, log)
		}
	}

	const maxLogs = 10000
	if len(logs) > maxLogs {
		logs = logs[len(logs)-maxLogs:]
	}
	// Reverse so the newest entries come first.
	for i, j := 0, len(logs)-1; i < j; i, j = i+1, j-1 {
		logs[i], logs[j] = logs[j], logs[i]
	}
	return logs
}

// AddRequestLog appends a new request log entry to the request.log file.
func AddRequestLog(log RequestLog) error {
	if log.ID == "" {
		log.ID = GenerateMachineId()
	}
	if log.Timestamp == 0 {
		log.Timestamp = time.Now().UnixMilli()
	}

	file, err := os.OpenFile(requestLogPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0600)
	if err != nil {
		return err
	}
	defer file.Close()

	data, err := json.Marshal(log)
	if err != nil {
		return err
	}
	_, err = file.Write(append(data, '\n'))
	return err
}

// ClearRequestLogs removes the request log file.
func ClearRequestLogs() error {
	if err := os.Remove(requestLogPath); err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}

// ==================== Upstream Response Log ====================

// AppendUpstreamLog 把上游响应原始 body 追加到 upstream.log。每条记录格式：
//
//	[2026-05-30T19:54:44Z] [Kiro IDE] HTTP 429
//	{"message":"...","reason":null}
//	---
//
// 失败时静默：不能因为日志写入失败影响主请求流程。
// 用途：仅在非 200（上游错误）响应时调用，把完整原始 body 留档便于排查；
// 成功响应不写此文件，避免日志无意义增长。
func AppendUpstreamLog(endpoint string, statusCode int, body string) {
	if upstreamLogPath == "" {
		return
	}
	file, err := os.OpenFile(upstreamLogPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0600)
	if err != nil {
		return
	}
	defer file.Close()

	// 时间戳用 RFC3339，便于 grep/ls 检索
	ts := time.Now().UTC().Format(time.RFC3339)
	fmt.Fprintf(file, "[%s] [%s] HTTP %d\n%s\n---\n", ts, endpoint, statusCode, body)
}
