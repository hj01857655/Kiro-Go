package config

import (
	"encoding/json"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
)

// 这组测试钉死本 fork 与 upstream 的核心分歧之一:
// usage 数据【完整存】Account.UsageData(json.RawMessage),【绝不平铺】到 Account 顶层。
//
// 背景:曾经从 upstream merge 后,本地"完整存 UsageData"的逻辑被原作者"挑字段平铺到
// Account"的逻辑顶掉,且当时没有测试报警,直到运行时才发现配额数据丢失。这几个测试就是
// 那次事故的回归哨兵 —— 将来 cherry-pick/merge 把平铺逻辑带回来,这里会当场变红。

// realEnterpriseUsageBody 是用户提供的真实 Enterprise /getUsageLimits 响应,
// 含 subscriptionInfo / overageCharges(高精度)/ overageConfiguration / ISO 日期。
// 用真实全字段响应才能证明"整包存"没有在任何字段上丢失信息。
const realEnterpriseUsageBody = `{"nextDateReset":"2026-06-01T00:00:00.000Z","overageConfiguration":{"overageStatus":"ENABLED"},"subscriptionInfo":{"overageCapability":"OVERAGE_CAPABLE","subscriptionManagementTarget":"MANAGE","subscriptionTitle":"KIRO PRO","type":"Q_DEVELOPER_STANDALONE_PRO","upgradeCapability":"UPGRADE_INCAPABLE"},"usageBreakdownList":[{"bonuses":[],"currency":"USD","currentOverages":311,"currentOveragesWithPrecision":311.45,"currentUsage":1311,"currentUsageWithPrecision":1311.45,"displayName":"Credit","displayNamePlural":"Credits","nextDateReset":"2026-06-01T00:00:00.000Z","overageCap":10000,"overageCapWithPrecision":10000,"overageCharges":12.458250431804,"overageRate":0.04,"resourceType":"CREDIT","unit":"INVOCATIONS","usageLimit":1000,"usageLimitWithPrecision":1000}],"userInfo":{"userId":"d-90660ceab3.548854a8-5041-707d-d194-dd8797af60e8"}}`

// TestUpdateAccountInfoStoresUsageDataVerbatim verifies the primary refresh path
// (UpdateAccountInfo) stores the upstream body byte-for-byte, proving no field is
// flattened, dropped, or precision-truncated.
func TestUpdateAccountInfoStoresUsageDataVerbatim(t *testing.T) {
	if err := Init(filepath.Join(t.TempDir(), "config.json")); err != nil {
		t.Fatalf("init config: %v", err)
	}
	acct := Account{ID: "acct-ent", Email: "ent@example.com", Provider: "Enterprise"}
	if err := AddAccount(acct); err != nil {
		t.Fatalf("add account: %v", err)
	}

	info := AccountInfo{
		Email:       "ent@example.com",
		UserId:      "d-90660ceab3.548854a8-5041-707d-d194-dd8797af60e8",
		LastRefresh: 1_780_000_000,
		UsageData:   json.RawMessage(realEnterpriseUsageBody),
	}
	if err := UpdateAccountInfo("acct-ent", info); err != nil {
		t.Fatalf("update account info: %v", err)
	}

	accounts := GetAccounts()
	if len(accounts) != 1 {
		t.Fatalf("expected 1 account, got %d", len(accounts))
	}
	// 字节级一致:整包存,无平铺、无丢字段、无精度截断。
	if got := string(accounts[0].UsageData); got != realEnterpriseUsageBody {
		t.Fatalf("UsageData not stored verbatim.\n got: %s\nwant: %s", got, realEnterpriseUsageBody)
	}
	// 完整性的额外证明:重新解出高精度 overageCharges 必须无损。
	var parsed struct {
		UsageBreakdownList []struct {
			OverageCharges float64 `json:"overageCharges"`
		} `json:"usageBreakdownList"`
	}
	if err := json.Unmarshal(accounts[0].UsageData, &parsed); err != nil {
		t.Fatalf("stored UsageData must remain valid JSON: %v", err)
	}
	if len(parsed.UsageBreakdownList) != 1 || parsed.UsageBreakdownList[0].OverageCharges != 12.458250431804 {
		t.Fatalf("overageCharges precision lost: %+v", parsed.UsageBreakdownList)
	}
}

// TestUpdateAccountUsageDataStoresVerbatim covers the secondary write path
// (UpdateAccountUsageData, used after setUserPreference / getUsageLimits).
func TestUpdateAccountUsageDataStoresVerbatim(t *testing.T) {
	if err := Init(filepath.Join(t.TempDir(), "config.json")); err != nil {
		t.Fatalf("init config: %v", err)
	}
	if err := AddAccount(Account{ID: "acct-pref", Email: "p@example.com"}); err != nil {
		t.Fatalf("add account: %v", err)
	}
	if err := UpdateAccountUsageData("acct-pref", json.RawMessage(realEnterpriseUsageBody)); err != nil {
		t.Fatalf("update usage data: %v", err)
	}
	accounts := GetAccounts()
	if got := string(accounts[0].UsageData); got != realEnterpriseUsageBody {
		t.Fatalf("UsageData not stored verbatim via UpdateAccountUsageData:\n got: %s", got)
	}
}

// TestUpdateAccountUsageDataEmptyIsNoOp verifies that a failed refresh (empty
// body) never wipes previously-stored usage. This guards the "len==0 => no-op"
// contract that keeps stale-but-present quota data instead of blanking it.
func TestUpdateAccountUsageDataEmptyIsNoOp(t *testing.T) {
	if err := Init(filepath.Join(t.TempDir(), "config.json")); err != nil {
		t.Fatalf("init config: %v", err)
	}
	if err := AddAccount(Account{ID: "acct-keep", Email: "k@example.com"}); err != nil {
		t.Fatalf("add account: %v", err)
	}
	if err := UpdateAccountUsageData("acct-keep", json.RawMessage(realEnterpriseUsageBody)); err != nil {
		t.Fatalf("seed usage data: %v", err)
	}
	// 模拟一次失败刷新:传入空 body,既有数据必须原样保留。
	if err := UpdateAccountUsageData("acct-keep", nil); err != nil {
		t.Fatalf("empty update should be a no-op, got: %v", err)
	}
	accounts := GetAccounts()
	if got := string(accounts[0].UsageData); got != realEnterpriseUsageBody {
		t.Fatalf("empty update wiped stored usage data, got: %q", got)
	}
}

// TestAccountStructHasNoFlattenedUsageFields is the structural guard against the
// upstream design we deliberately diverge from: it asserts the Account struct
// carries usage ONLY as the opaque UsageData blob, with NO flattened scalar
// usage fields hoisted to the top level. If a future upstream cherry-pick/merge
// reintroduces fields like UsageLimit/CurrentUsage/NextDateReset/OverageCharges
// onto Account, this test fails — flagging the structural regression before it
// silently changes how usage is stored.
func TestAccountStructHasNoFlattenedUsageFields(t *testing.T) {
	// 这些是 /getUsageLimits 响应里的字段名;它们只允许活在 UsageData 内部的 JSON 里,
	// 绝不允许作为 Account struct 的顶层字段出现。
	forbidden := []string{
		"usagelimit", "usagelimitwithprecision",
		"currentusage", "currentusagewithprecision",
		"currentoverages", "currentoverageswithprecision",
		"overagecharges", "overagerate", "overagecap",
		"nextdatereset", "subscriptioninfo", "usagebreakdown",
		"freetrialinfo", "freetrialexpiry", "overageconfiguration",
		"overagestatus", "subscriptiontitle",
	}
	allowed := map[string]bool{
		"usagedata": true, // 唯一允许的 usage 载体
	}

	rt := reflect.TypeOf(Account{})
	for i := 0; i < rt.NumField(); i++ {
		fieldLower := strings.ToLower(rt.Field(i).Name)
		if allowed[fieldLower] {
			continue
		}
		for _, bad := range forbidden {
			if strings.Contains(fieldLower, bad) {
				t.Fatalf("Account struct gained a flattened usage field %q (contains %q). "+
					"usage data must stay verbatim inside UsageData, never flattened to the top level.",
					rt.Field(i).Name, bad)
			}
		}
	}
}
