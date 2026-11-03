package logger

import (
	"context"
	"testing"

	"go.uber.org/zap"
	"go.uber.org/zap/zaptest/observer"
)

// Callers put sessionID into ctx as string or uint64; both must reach the log.
func TestPrepareSessionIDTypes(t *testing.T) {
	for name, val := range map[string]interface{}{"string": "42", "uint64": uint64(42)} {
		core, logs := observer.New(zap.InfoLevel)
		l := &loggerImpl{l: zap.New(core)}
		l.Error(context.WithValue(context.Background(), "sessionID", val), "boom")
		if got := logs.All()[0].ContextMap()["sessionID"]; got != "42" {
			t.Errorf("%s: sessionID = %v, want \"42\"", name, got)
		}
	}
}
