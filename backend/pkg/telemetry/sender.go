package telemetry

import (
	"context"
	"fmt"
	"time"

	"openreplay/backend/pkg/senders"
)

// Sender posts the stats to the OpenReplay telemetry endpoint.
type Sender interface {
	Send(ctx context.Context, stats []Stat) error
}

type httpSender struct {
	http     *senders.HTTP
	endpoint string
}

func NewSender(endpoint string, timeout time.Duration) Sender {
	return &httpSender{http: senders.NewHTTP("", timeout), endpoint: endpoint}
}

// Send mirrors requests.post(url, json={"stats": [...]}).
func (s *httpSender) Send(ctx context.Context, stats []Stat) error {
	if _, _, err := s.http.PostJSON(ctx, s.endpoint, map[string]any{"stats": stats}, nil); err != nil {
		return fmt.Errorf("post telemetry to %s: %w", s.endpoint, err)
	}
	return nil
}
