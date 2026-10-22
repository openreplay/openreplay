package senders

import (
	"context"
	"fmt"
	"strings"
	"time"
)

const slackBatchSize = 100

type Slack struct {
	http    *HTTP
	siteURL string
	now     func() time.Time
}

func NewSlack(h *HTTP, siteURL string) *Slack {
	return &Slack{http: h, siteURL: strings.TrimRight(siteURL, "/"), now: time.Now}
}

type slackAttachment struct {
	Text      string  `json:"text"`
	Title     string  `json:"title"`
	TitleLink string  `json:"title_link"`
	TS        float64 `json:"ts"`
}

func (s *Slack) attachment(it Item) slackAttachment {
	link := s.siteURL + it.ButtonURL
	return slackAttachment{
		Text:      fmt.Sprintf("%s\n<%s|%s>", it.Description, link, it.ButtonText),
		Title:     it.Title,
		TitleLink: link,
		TS:        float64(s.now().UnixNano()) / 1e9,
	}
}

// Send posts the items to one Slack incoming-webhook endpoint, 100 attachments per request.
func (s *Slack) Send(ctx context.Context, endpoint string, items []Item) error {
	attachments := make([]slackAttachment, 0, len(items))
	for _, it := range items {
		attachments = append(attachments, s.attachment(it))
	}
	var firstErr error
	for _, part := range chunk(attachments, slackBatchSize) {
		if _, _, err := s.http.PostJSON(ctx, endpoint, map[string]any{"attachments": part}, nil); err != nil && firstErr == nil {
			firstErr = err
		}
	}
	return firstErr
}
