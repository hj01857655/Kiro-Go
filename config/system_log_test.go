package config

import (
	"path/filepath"
	"testing"
	"time"

	"kiro-go/logger"
)

// TestSystemLogReachesAuditStore is the end-to-end proof that the admin
// "Global Logs" panel data source (GetAuditLogs) surfaces backend RUNTIME logs
// emitted via the logger package — not only management-audit operations.
//
// It wires the real production hookup (logger.SetSink(AddSystemLog)), emits a
// plain runtime log line that corresponds to NO admin action, then reads the
// store back the same way the panel's HTTP handler does.
func TestSystemLogReachesAuditStore(t *testing.T) {
	if err := Init(filepath.Join(t.TempDir(), "config.json")); err != nil {
		t.Fatalf("Init: %v", err)
	}

	// Exact production wiring from main.go.
	logger.SetOutput(discard{})
	logger.SetLevel(logger.LevelInfo)
	logger.SetSink(AddSystemLog)
	defer logger.SetSink(nil)

	const marker = "runtime-only-log-not-an-admin-action-42"
	logger.Errorf("upstream call failed: %s", marker)

	// AddSystemLog is async (buffered channel + background worker). Poll the
	// store the same way the panel does until the entry lands.
	var found *AuditLog
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		for i := range GetAuditLogs() {
			l := GetAuditLogs()[i]
			if l.Message == "upstream call failed: "+marker {
				found = &l
				break
			}
		}
		if found != nil {
			break
		}
		time.Sleep(20 * time.Millisecond)
	}

	if found == nil {
		t.Fatal("runtime log line never reached the audit store — panel would NOT show backend logs")
	}
	if found.Action != "system.log" {
		t.Errorf("Action = %q, want \"system.log\" (must be tagged as a runtime log, not an audit op)", found.Action)
	}
	if found.Level != "error" {
		t.Errorf("Level = %q, want \"error\"", found.Level)
	}
	if found.User != "system" {
		t.Errorf("User = %q, want \"system\"", found.User)
	}
}

type discard struct{}

func (discard) Write(p []byte) (int, error) { return len(p), nil }
