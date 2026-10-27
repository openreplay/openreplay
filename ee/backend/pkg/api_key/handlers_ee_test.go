package api_key

import (
	"strconv"
	"strings"
	"testing"
	"time"

	config "openreplay/backend/internal/config/api"
	"openreplay/backend/pkg/assist"
)

func TestAssistCredentialsTTL(t *testing.T) {
	for _, tt := range []struct {
		configured int
		want       int
	}{
		{0, assist.DefaultTurnTTLHours},
		{12, 12},
	} {
		h := &handlersImpl{cfg: &config.Config{AssistSecret: "s", AssistTTL: tt.configured}}
		res, code, err := h.getAssistCredentials(nil)
		if err != nil || code != 0 {
			t.Fatalf("ttl %d: unexpected failure %d %v", tt.configured, code, err)
		}
		expiry, err := strconv.ParseInt(strings.Split(res.(*assist.TurnCredentials).Username, ":")[0], 10, 64)
		if err != nil {
			t.Fatalf("bad username: %v", res)
		}
		if got := time.Until(time.Unix(expiry, 0)).Round(time.Hour); got != time.Duration(tt.want)*time.Hour {
			t.Fatalf("ttl %d: got %s, want %dh", tt.configured, got, tt.want)
		}
	}
}
