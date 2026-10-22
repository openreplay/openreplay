package senders

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"openreplay/backend/pkg/integrations/clients"
)

const maxResponseBytes = 4096

// HTTP posts JSON to user-supplied endpoints. Destinations go through the SSRF-safe
// client (public IPs only, no redirects) unless their hostname is in allowedHosts, which
// replaces the Python WEBHOOK_ALLOWED_HOSTS escape hatch for self-hosted proxies.
type HTTP struct {
	allowedHosts map[string]struct{}
	safe         *http.Client
	plain        *http.Client
}

func NewHTTP(allowedHosts string, timeout time.Duration) *HTTP {
	if timeout <= 0 {
		timeout = 10 * time.Second
	}
	allowed := map[string]struct{}{}
	for _, h := range strings.Split(allowedHosts, ",") {
		h = strings.ToLower(strings.TrimSpace(h))
		if h != "" {
			allowed[h] = struct{}{}
		}
	}
	noRedirect := func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }
	return &HTTP{
		allowedHosts: allowed,
		safe:         &http.Client{Timeout: timeout, Transport: clients.SafeTransport, CheckRedirect: noRedirect},
		plain:        &http.Client{Timeout: timeout, CheckRedirect: noRedirect},
	}
}

func (h *HTTP) clientFor(raw string) (*http.Client, error) {
	u, err := url.Parse(raw)
	if err != nil {
		return nil, fmt.Errorf("invalid url: %w", err)
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return nil, fmt.Errorf("unsupported url scheme %q", u.Scheme)
	}
	if _, ok := h.allowedHosts[strings.ToLower(u.Hostname())]; ok {
		return h.plain, nil
	}
	if err := clients.ValidateExternalURL(raw); err != nil {
		return nil, err
	}
	return h.safe, nil
}

// PostJSON sends body as JSON and returns the status code and (truncated) response body.
// A non-2xx status is returned as an error.
func (h *HTTP) PostJSON(ctx context.Context, endpoint string, body any, headers map[string]string) (int, []byte, error) {
	client, err := h.clientFor(endpoint)
	if err != nil {
		return 0, nil, err
	}
	payload, err := json.Marshal(body)
	if err != nil {
		return 0, nil, fmt.Errorf("marshal body: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(payload))
	if err != nil {
		return 0, nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	resp, err := client.Do(req)
	if err != nil {
		return 0, nil, err
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(io.LimitReader(resp.Body, maxResponseBytes))
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return resp.StatusCode, respBody, fmt.Errorf("unexpected status %d: %s", resp.StatusCode, strings.TrimSpace(string(respBody)))
	}
	return resp.StatusCode, respBody, nil
}

func chunk[T any](items []T, size int) [][]T {
	if size <= 0 {
		size = len(items)
	}
	var out [][]T
	for i := 0; i < len(items); i += size {
		end := i + size
		if end > len(items) {
			end = len(items)
		}
		out = append(out, items[i:end])
	}
	return out
}
