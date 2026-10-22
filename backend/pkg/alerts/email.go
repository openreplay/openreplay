package alerts

import (
	"context"
	"fmt"
	"strings"
	"time"

	"openreplay/backend/pkg/senders"
)

const emailTemplate = "alert_notification.html"

// EmailSender adapts the generic senders.Email to alert notifications: it owns the subject
// line and the alert_notification.html template data.
type EmailSender struct {
	email   *senders.Email
	siteURL string
	now     func() time.Time
}

func NewEmailSender(email *senders.Email, siteURL string) *EmailSender {
	return &EmailSender{email: email, siteURL: strings.TrimRight(siteURL, "/"), now: time.Now}
}

type emailTemplateData struct {
	Message     string
	FrontendURL string
	ProjectID   int64
	Year        int
}

// EmailSubject mirrors the Python service: `"<title>" has been triggered`.
func EmailSubject(it senders.Item) string {
	return fmt.Sprintf("%q has been triggered", it.Title)
}

func (s *EmailSender) Configured() bool { return s.email.Configured() }

func (s *EmailSender) render(it senders.Item) (string, error) {
	return s.email.Render(emailTemplate, emailTemplateData{
		Message:     fmt.Sprintf("%q %s", it.Title, it.Description),
		FrontendURL: s.siteURL,
		ProjectID:   it.ProjectID,
		Year:        s.now().Year(),
	})
}

// Send renders and e-mails one alert notification to one recipient.
func (s *EmailSender) Send(ctx context.Context, recipient string, it senders.Item) error {
	html, err := s.render(it)
	if err != nil {
		return fmt.Errorf("render alert email: %w", err)
	}
	return s.email.Send(ctx, recipient, EmailSubject(it), html)
}
