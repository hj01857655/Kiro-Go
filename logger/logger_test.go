package logger

import (
	"bytes"
	"sync"
	"testing"
)

// TestSinkReceivesEmittedLines verifies that a registered sink receives every
// log line (with the right level), and that detaching with nil stops delivery.
func TestSinkReceivesEmittedLines(t *testing.T) {
	// Silence stdout/stderr during the test.
	SetOutput(&bytes.Buffer{})
	SetLevel(LevelDebug)
	defer SetSink(nil)

	type line struct {
		level string
		msg   string
	}
	var (
		mu   sync.Mutex
		seen []line
	)
	SetSink(func(level, message string) {
		mu.Lock()
		seen = append(seen, line{level, message})
		mu.Unlock()
	})

	Debugf("d-%d", 1)
	Infof("i-%s", "x")
	Warnf("w")
	Errorf("e-%v", true)

	mu.Lock()
	got := append([]line(nil), seen...)
	mu.Unlock()

	want := []line{
		{"debug", "d-1"},
		{"info", "i-x"},
		{"warning", "w"},
		{"error", "e-true"},
	}
	if len(got) != len(want) {
		t.Fatalf("sink received %d lines, want %d: %+v", len(got), len(want), got)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Errorf("line %d = %+v, want %+v", i, got[i], want[i])
		}
	}
}

// TestSinkRespectsLevel verifies the sink only fires for lines at or above the
// configured level (sink calls live inside the enabled() gate).
func TestSinkRespectsLevel(t *testing.T) {
	SetOutput(&bytes.Buffer{})
	SetLevel(LevelWarn)
	defer SetSink(nil)
	defer SetLevel(LevelInfo)

	var count int
	SetSink(func(level, message string) { count++ })

	Debugf("d") // below threshold — dropped
	Infof("i")  // below threshold — dropped
	Warnf("w")  // emitted
	Errorf("e") // emitted

	if count != 2 {
		t.Fatalf("sink fired %d times, want 2 (warn+error only)", count)
	}
}

// TestSinkDetach verifies SetSink(nil) stops delivery.
func TestSinkDetach(t *testing.T) {
	SetOutput(&bytes.Buffer{})
	SetLevel(LevelInfo)

	var count int
	SetSink(func(level, message string) { count++ })
	Infof("one")
	SetSink(nil)
	Infof("two")

	if count != 1 {
		t.Fatalf("sink fired %d times after detach, want 1", count)
	}
}
