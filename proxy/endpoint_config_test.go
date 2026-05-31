package proxy

import (
	"encoding/json"
	"kiro-go/config"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// 回归哨兵:apiUpdateEndpointConfig 的校验白名单必须接受空串 ""。
//
// 背景:后端处处把空串当作 "auto" 的同义词 —— GetPreferredEndpoint 读时
// 把 "" 归一成 "auto",getSortedEndpoints 的 default 分支也按 auto 处理,
// 前端保存时同样发空串(auto -> "")。曾经校验白名单漏掉了 "",导致后端把
// 自己处处视为合法的 auto 值在保存接口上拒成 400(admin 面板保存设置报错)。
// 这个测试钉死:前端发来的合法 auto 值(空串)必须能存进去,绝不能再 400。
func updateEndpointConfig(t *testing.T, body string) *httptest.ResponseRecorder {
	t.Helper()
	mustInitConfig(t)
	h := &Handler{}
	r := httptest.NewRequest(http.MethodPost, "/admin/api/endpoint", strings.NewReader(body))
	w := httptest.NewRecorder()
	h.apiUpdateEndpointConfig(w, r)
	return w
}

func TestUpdateEndpointConfigAcceptsEmptyStringAsAuto(t *testing.T) {
	w := updateEndpointConfig(t, `{"preferredEndpoint":"","endpointFallback":true}`)
	if w.Code != http.StatusOK {
		t.Fatalf("empty preferredEndpoint must be accepted as auto, got status %d: %s", w.Code, w.Body.String())
	}
	// 存进去之后再读出来,必须归一成 "auto"(与前端 loadSettings 的预期一致)。
	if got := config.GetPreferredEndpoint(); got != "auto" {
		t.Fatalf("expected stored endpoint to normalize to auto, got %q", got)
	}
}

func TestUpdateEndpointConfigAcceptsKnownEndpoints(t *testing.T) {
	for _, ep := range []string{"auto", "kiro", "codewhisperer", "amazonq"} {
		w := updateEndpointConfig(t, `{"preferredEndpoint":"`+ep+`","endpointFallback":true}`)
		if w.Code != http.StatusOK {
			t.Fatalf("endpoint %q must be accepted, got status %d: %s", ep, w.Code, w.Body.String())
		}
	}
}

func TestUpdateEndpointConfigRejectsUnknownEndpoint(t *testing.T) {
	w := updateEndpointConfig(t, `{"preferredEndpoint":"bogus","endpointFallback":true}`)
	if w.Code != http.StatusBadRequest {
		t.Fatalf("unknown endpoint must be rejected with 400, got status %d", w.Code)
	}
	var resp map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("error body must be JSON: %v", err)
	}
	if resp["error"] == "" {
		t.Fatalf("expected an error message for invalid endpoint, got %q", w.Body.String())
	}
}
