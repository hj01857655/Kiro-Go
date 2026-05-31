package proxy

import (
	"kiro-go/config"
	"strings"
	"testing"
)

// TestApplyPromptInjectionsPositions covers the three documented placement
// modes — prefix, append, default-on-unknown — plus the disabled/empty-content
// short-circuits. These are the contract operators rely on when crafting
// persona presets and standing instructions.
func TestApplyPromptInjectionsPositions(t *testing.T) {
	base := "ORIGINAL"
	injections := []config.PromptInjection{
		{ID: "1", Name: "persona", Position: "prefix", Content: "PREFIX_A", Enabled: true},
		{ID: "2", Name: "trailing", Position: "append", Content: "SUFFIX_B", Enabled: true},
		{ID: "3", Name: "unknown", Position: "weird-mode", Content: "SUFFIX_C", Enabled: true},
		{ID: "4", Name: "disabled", Position: "prefix", Content: "SHOULD_NOT_APPEAR", Enabled: false},
		{ID: "5", Name: "blank", Position: "append", Content: "   ", Enabled: true},
	}

	got := applyPromptInjections(base, injections)

	// Order: prefixes (in list order), then prompt, then suffixes (append + unknown fallthrough).
	want := "PREFIX_A\n\nORIGINAL\n\nSUFFIX_B\n\nSUFFIX_C"
	if got != want {
		t.Fatalf("unexpected output\n  want: %q\n  got:  %q", want, got)
	}

	if strings.Contains(got, "SHOULD_NOT_APPEAR") {
		t.Errorf("disabled injection leaked into output: %q", got)
	}
}

// TestApplyPromptInjectionsEmptyPrompt verifies a "prefix" injection on an empty
// system prompt becomes the system prompt — the operator's stated intent for
// this configuration.
func TestApplyPromptInjectionsEmptyPrompt(t *testing.T) {
	injections := []config.PromptInjection{
		{ID: "1", Position: "prefix", Content: "STANDING ORDER", Enabled: true},
	}
	got := applyPromptInjections("", injections)
	if got != "STANDING ORDER" {
		t.Fatalf("expected injection to become the system prompt; got %q", got)
	}
}

// TestApplyPromptInjectionsNoEnabledIsIdentity ensures the function is a no-op
// when no enabled injections exist, so callers can chain it unconditionally.
func TestApplyPromptInjectionsNoEnabledIsIdentity(t *testing.T) {
	prompt := "untouched"
	got := applyPromptInjections(prompt, nil)
	if got != prompt {
		t.Fatalf("nil injections should be identity; got %q", got)
	}
	got = applyPromptInjections(prompt, []config.PromptInjection{
		{ID: "1", Position: "prefix", Content: "x", Enabled: false},
	})
	if got != prompt {
		t.Fatalf("all-disabled injections should be identity; got %q", got)
	}
}

// TestApplyPromptFiltersWithConfigChain verifies the full chain — Claude Code
// detection runs first, user rules fire, and injections wrap the result.
func TestApplyPromptFiltersWithConfigChain(t *testing.T) {
	cfg := config.PromptFilterConfig{
		FilterClaudeCode:      false,
		FilterEnvNoise:        false,
		FilterStripBoundaries: false,
		Rules: []config.PromptFilterRule{
			{Type: "regex", Match: "SECRET", Replace: "REDACTED", Enabled: true},
		},
		Injections: []config.PromptInjection{
			{ID: "1", Position: "append", Content: "TAIL", Enabled: true},
		},
	}
	got := applyPromptFiltersWithConfig("hello SECRET world", cfg)
	want := "hello REDACTED world\n\nTAIL"
	if got != want {
		t.Fatalf("chain output mismatch\n  want: %q\n  got:  %q", want, got)
	}
}

// TestApplyToolDescriptionInjectionsHit verifies the case-insensitive name
// match, multiple-rule concatenation, and disabled/empty short-circuits.
func TestApplyToolDescriptionInjectionsHit(t *testing.T) {
	rules := []config.ToolDescriptionInjection{
		{ID: "1", Name: "write-policy", ToolNames: []string{"Write"}, Suffix: "POLICY_A", Enabled: true},
		{ID: "2", Name: "write-policy-extra", ToolNames: []string{"write"}, Suffix: "POLICY_B", Enabled: true},
		{ID: "3", Name: "edit-only", ToolNames: []string{"Edit"}, Suffix: "POLICY_C", Enabled: true},
		{ID: "4", Name: "disabled", ToolNames: []string{"Write"}, Suffix: "SHOULD_NOT_APPEAR", Enabled: false},
	}

	got := applyToolDescriptionInjections("base description", "Write", rules)
	want := "base description\nPOLICY_A\nPOLICY_B"
	if got != want {
		t.Fatalf("Write tool injection mismatch\n  want: %q\n  got:  %q", want, got)
	}

	// Mismatched tool name → identity.
	if got := applyToolDescriptionInjections("base", "OtherTool", rules); got != "base" {
		t.Fatalf("mismatched tool name should be identity, got %q", got)
	}

	// Empty tool name → identity (defensive).
	if got := applyToolDescriptionInjections("base", "", rules); got != "base" {
		t.Fatalf("empty tool name should be identity, got %q", got)
	}
}

// TestApplyToolDescriptionInjectionsEmptyDescription covers the case where the
// upstream tool ships with an empty description — the suffix becomes the entire
// description rather than starting with a stray newline.
func TestApplyToolDescriptionInjectionsEmptyDescription(t *testing.T) {
	rules := []config.ToolDescriptionInjection{
		{ID: "1", ToolNames: []string{"Write"}, Suffix: "ONLY_RULE", Enabled: true},
	}
	got := applyToolDescriptionInjections("", "Write", rules)
	if got != "ONLY_RULE" {
		t.Fatalf("expected suffix to become description, got %q", got)
	}
}

// TestApplyToolDescriptionInjectionsEmptyToolNames guards a footgun: an injection
// with no ToolNames must NEVER match anything (otherwise it would silently
// inject into every tool).
func TestApplyToolDescriptionInjectionsEmptyToolNames(t *testing.T) {
	rules := []config.ToolDescriptionInjection{
		{ID: "1", ToolNames: nil, Suffix: "DANGER", Enabled: true},
		{ID: "2", ToolNames: []string{}, Suffix: "ALSO_DANGER", Enabled: true},
	}
	got := applyToolDescriptionInjections("base", "Write", rules)
	if got != "base" {
		t.Fatalf("empty ToolNames must never match; got %q", got)
	}
}
