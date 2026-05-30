package config

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestAppendUpstreamLogWritesEntries(t *testing.T) {
	dir := t.TempDir()
	if err := Init(filepath.Join(dir, "config.json")); err != nil {
		t.Fatalf("init: %v", err)
	}

	AppendUpstreamLog("Kiro IDE", 429, `{"message":"rate limited","reason":null}`)
	AppendUpstreamLog("CodeWhisperer", 400, `{"message":"Invalid model"}`)

	data, err := os.ReadFile(filepath.Join(dir, "upstream.log"))
	if err != nil {
		t.Fatalf("read upstream.log: %v", err)
	}
	got := string(data)

	for _, want := range []string{"[Kiro IDE] HTTP 429", "rate limited", "[CodeWhisperer] HTTP 400", "Invalid model", "---"} {
		if !strings.Contains(got, want) {
			t.Errorf("upstream.log missing %q in:\n%s", want, got)
		}
	}
}

func TestAppendUpstreamLogSilentOnUninit(t *testing.T) {
	// Save+clear path so we test the early-return branch without touching real files.
	saved := upstreamLogPath
	upstreamLogPath = ""
	defer func() { upstreamLogPath = saved }()

	// Should not panic.
	AppendUpstreamLog("X", 500, "irrelevant")
}
