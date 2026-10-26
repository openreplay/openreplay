package webhooks

import (
	"bytes"
	"errors"
	"fmt"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"unicode/utf8"
)

const (
	typeWebhook         = "webhook"
	maxNameLength       = 100
	maxEndpointLength   = 2048
	maxAuthHeaderLength = 4096
)

var (
	ErrWebhookNotFound = errors.New("webhook not found.")
	ErrNameExists      = errors.New("name already exists.")
)

var webhookNamePattern = regexp.MustCompile(`^[a-zA-Z0-9\-éèàç |&/\\_.#':,@]*$`)

type Webhook struct {
	WebhookID  int64  `json:"webhookId"`
	Endpoint   string `json:"endpoint"`
	AuthHeader string `json:"authHeader"`
	Type       string `json:"type"`
	Index      int    `json:"index"`
	Name       string `json:"name"`
	CreatedAt  int64  `json:"createdAt"`
}

func (w *Webhook) redact() {
	if w.Type != typeWebhook {
		w.Endpoint = ""
		w.AuthHeader = ""
	}
}

type webhookID struct {
	value *int64
}

func (id *webhookID) UnmarshalJSON(data []byte) error {
	data = bytes.TrimSpace(data)
	if bytes.Equal(data, []byte("null")) {
		return nil
	}
	raw := string(data)
	if unquoted, err := strconv.Unquote(raw); err == nil {
		raw = unquoted
	}
	if raw == "" {
		return nil
	}
	v, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || v <= 0 {
		return fmt.Errorf("invalid webhookId")
	}
	id.value = &v
	return nil
}

type WebhookRequest struct {
	WebhookID  webhookID `json:"webhookId"`
	Endpoint   string    `json:"endpoint"`
	AuthHeader *string   `json:"authHeader"`
	Name       string    `json:"name"`
}

func (r *WebhookRequest) ID() *int64 {
	return r.WebhookID.value
}

func (r *WebhookRequest) Normalize() error {
	r.Name = strings.Join(strings.Fields(r.Name), " ")
	if r.Name == "" {
		return errors.New("name is required")
	}
	if utf8.RuneCountInString(r.Name) > maxNameLength {
		return fmt.Errorf("name must be at most %d characters", maxNameLength)
	}
	if !webhookNamePattern.MatchString(r.Name) {
		return errors.New("name contains invalid characters")
	}

	r.Endpoint = strings.TrimSpace(r.Endpoint)
	if r.Endpoint == "" {
		return errors.New("endpoint is required")
	}
	if len(r.Endpoint) > maxEndpointLength {
		return fmt.Errorf("endpoint must be at most %d characters", maxEndpointLength)
	}
	u, err := url.Parse(r.Endpoint)
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Hostname() == "" {
		return errors.New("endpoint must be a valid http or https URL")
	}

	if r.AuthHeader != nil && len(*r.AuthHeader) > maxAuthHeaderLength {
		return fmt.Errorf("authHeader must be at most %d characters", maxAuthHeaderLength)
	}
	return nil
}
