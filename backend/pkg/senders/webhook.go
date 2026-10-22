package senders

import "context"

type Webhook struct {
	http *HTTP
}

func NewWebhook(h *HTTP) *Webhook { return &Webhook{http: h} }

// Send posts data as JSON to a generic webhook, with an Authorization header when configured.
func (w *Webhook) Send(ctx context.Context, endpoint, authHeader string, data map[string]any) error {
	var headers map[string]string
	if authHeader != "" {
		headers = map[string]string{"Authorization": authHeader}
	}
	_, _, err := w.http.PostJSON(ctx, endpoint, data, headers)
	return err
}
