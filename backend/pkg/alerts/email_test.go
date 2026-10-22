package alerts

import (
	"context"
	"strings"
	"testing"
	"time"

	"openreplay/backend/internal/config/common"
	"openreplay/backend/pkg/senders"
)

func testEmailSender(t *testing.T, host string) *EmailSender {
	t.Helper()
	e, err := senders.NewEmail(common.SMTP{Host: host, Port: 587, UseTLS: true, From: "OpenReplay<do-not-reply@openreplay.com>"})
	if err != nil {
		t.Fatal(err)
	}
	s := NewEmailSender(e, "https://app.example.com/")
	s.now = func() time.Time { return time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC) }
	return s
}

func TestEmailSenderRender(t *testing.T) {
	s := testEmailSender(t, "smtp.example.com")
	it := senders.Item{Title: "Alert A", Description: "x = 1 (> 0).", ButtonURL: "/7/metrics", ProjectID: 7}
	if got := EmailSubject(it); got != `"Alert A" has been triggered` {
		t.Errorf("subject: %s", got)
	}
	html, err := s.render(it)
	if err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{`cid:img-0`, `&#34;Alert A&#34; x = 1 (&gt; 0).`, `https://app.example.com/7/metrics`, "2026"} {
		if !strings.Contains(html, want) {
			t.Errorf("rendered html missing %q", want)
		}
	}
}

func TestEmailSenderNotConfigured(t *testing.T) {
	s := testEmailSender(t, "")
	if s.Configured() {
		t.Error("should not be configured")
	}
	if err := s.Send(context.Background(), "dev@example.com", senders.Item{Title: "t"}); err == nil {
		t.Error("send without smtp should error")
	}
}
