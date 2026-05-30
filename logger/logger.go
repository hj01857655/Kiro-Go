// Package logger provides a lightweight leveled logger for Kiro-Go.
//
// Levels (from most to least verbose):
//
//	DEBUG < INFO < WARN < ERROR
//
// The active level is configured via logger.Init at startup.
// Priority: LOG_LEVEL environment variable > provided fallback (usually
// taken from config.json "logLevel"). If neither is set or the value is
// unrecognized, the level defaults to INFO.
package logger

import (
	"fmt"
	"io"
	"log"
	"os"
	"strings"
	"sync/atomic"
)

// Level represents a log severity.
type Level int32

const (
	LevelDebug Level = iota
	LevelInfo
	LevelWarn
	LevelError
)

var (
	currentLevel atomic.Int32

	debugLog = log.New(os.Stdout, "DEBUG ", log.LstdFlags)
	infoLog  = log.New(os.Stdout, "INFO  ", log.LstdFlags)
	warnLog  = log.New(os.Stderr, "WARN  ", log.LstdFlags)
	errorLog = log.New(os.Stderr, "ERROR ", log.LstdFlags)

	// sink, when set, receives a copy of every emitted log line so a consumer
	// (e.g. the admin panel store) can persist it. It must never block: the
	// registered function is expected to hand off asynchronously. The logger
	// package deliberately does NOT import config, to avoid an import cycle;
	// main.go wires the sink at startup.
	sink atomic.Pointer[func(level, message string)]
)

// SetSink registers a function that receives every log line (level + formatted
// message). Pass nil to detach. The callback must not block the caller.
func SetSink(fn func(level, message string)) {
	if fn == nil {
		sink.Store(nil)
		return
	}
	sink.Store(&fn)
}

// emitSink forwards a line to the registered sink, if any.
func emitSink(level, message string) {
	if p := sink.Load(); p != nil {
		(*p)(level, message)
	}
}

func init() {
	currentLevel.Store(int32(LevelInfo))
}

// ParseLevel converts a textual level ("debug", "info", "warn", "error")
// to a Level. The ok flag is false when the input is empty or unknown.
func ParseLevel(s string) (Level, bool) {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "debug", "trace":
		return LevelDebug, true
	case "info":
		return LevelInfo, true
	case "warn", "warning":
		return LevelWarn, true
	case "error", "err":
		return LevelError, true
	}
	return LevelInfo, false
}

// LevelName returns the canonical lowercase name of a Level.
func LevelName(l Level) string {
	switch l {
	case LevelDebug:
		return "debug"
	case LevelInfo:
		return "info"
	case LevelWarn:
		return "warn"
	case LevelError:
		return "error"
	}
	return "info"
}

// SetLevel sets the active log level.
func SetLevel(l Level) {
	currentLevel.Store(int32(l))
}

// GetLevel returns the active log level.
func GetLevel() Level {
	return Level(currentLevel.Load())
}

// SetOutput redirects all level outputs to w. Useful for tests.
func SetOutput(w io.Writer) {
	debugLog.SetOutput(w)
	infoLog.SetOutput(w)
	warnLog.SetOutput(w)
	errorLog.SetOutput(w)
}

// Init configures the logger. The LOG_LEVEL environment variable, if set,
// overrides the supplied fallback (typically config.GetLogLevel()).
func Init(fallback string) {
	value := fallback
	if env := os.Getenv("LOG_LEVEL"); env != "" {
		value = env
	}
	if l, ok := ParseLevel(value); ok {
		SetLevel(l)
	}
}

func enabled(l Level) bool {
	return Level(currentLevel.Load()) <= l
}

// Debugf logs a formatted message at DEBUG level.
func Debugf(format string, v ...interface{}) {
	if enabled(LevelDebug) {
		msg := fmt.Sprintf(format, v...)
		debugLog.Print(msg)
		emitSink("debug", msg)
	}
}

// Infof logs a formatted message at INFO level.
func Infof(format string, v ...interface{}) {
	if enabled(LevelInfo) {
		msg := fmt.Sprintf(format, v...)
		infoLog.Print(msg)
		emitSink("info", msg)
	}
}

// Warnf logs a formatted message at WARN level.
func Warnf(format string, v ...interface{}) {
	if enabled(LevelWarn) {
		msg := fmt.Sprintf(format, v...)
		warnLog.Print(msg)
		emitSink("warning", msg)
	}
}

// Errorf logs a formatted message at ERROR level.
func Errorf(format string, v ...interface{}) {
	if enabled(LevelError) {
		msg := fmt.Sprintf(format, v...)
		errorLog.Print(msg)
		emitSink("error", msg)
	}
}

// Fatalf logs a formatted message at ERROR level and terminates the process.
func Fatalf(format string, v ...interface{}) {
	msg := fmt.Sprintf(format, v...)
	errorLog.Print(msg)
	emitSink("error", msg)
	os.Exit(1)
}
