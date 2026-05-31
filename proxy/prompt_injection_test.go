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
