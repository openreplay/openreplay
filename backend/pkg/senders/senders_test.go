package senders

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"net/mail"
	"net/url"
	"strings"
	"sync"
	"testing"
	"time"

	"openreplay/backend/internal/config/common"
)

type capture struct {
	mu      sync.Mutex
	bodies  [][]byte
	headers []http.Header
	status  int
}

func newServer(t *testing.T, status int) (*httptest.Server, *capture) {
	t.Helper()
	c := &capture{status: status}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		b, _ := io.ReadAll(r.Body)
		c.mu.Lock()
		c.bodies = append(c.bodies, b)
		c.headers = append(c.headers, r.Header.Clone())
		c.mu.Unlock()
		w.WriteHeader(c.status)
		_, _ = w.Write([]byte("resp"))
	}))
	t.Cleanup(srv.Close)
	return srv, c
}

// httptest servers listen on loopback, which the safe client blocks: allow the host explicitly.
func httpFor(srv *httptest.Server) *HTTP {
	u, _ := url.Parse(srv.URL)
	return NewHTTP(u.Hostname(), 5*time.Second)
}

func items(n int) []Item {
	out := make([]Item, n)
	for i := range out {
		out[i] = Item{Title: "Alert " + string(rune('A'+i%26)), Description: "x = 1 (> 0).", ButtonText: "Check metrics for more details",
			ButtonURL: "/7/metrics", ProjectID: 7, ProjectName: "proj"}
	}
	return out
}

func TestSSRFGuard(t *testing.T) {
	srv, c := newServer(t, 200)
	// not allowed: loopback must be refused before any request is made
	h := NewHTTP("", time.Second)
	if _, _, err := h.PostJSON(context.Background(), srv.URL, map[string]any{}, nil); err == nil {
		t.Error("loopback endpoint should be rejected by default")
	}
	if len(c.bodies) != 0 {
		t.Error("no request should have been made")
	}
	if _, _, err := h.PostJSON(context.Background(), "ftp://example.com", nil, nil); err == nil {
		t.Error("non-http scheme should be rejected")
	}
	// allowed host passes
	if _, _, err := httpFor(srv).PostJSON(context.Background(), srv.URL, map[string]any{"a": 1}, nil); err != nil {
		t.Errorf("allowed host should pass: %v", err)
	}
}

func TestPostJSONNon2xx(t *testing.T) {
	srv, _ := newServer(t, 500)
	status, body, err := httpFor(srv).PostJSON(context.Background(), srv.URL, map[string]any{}, nil)
	if err == nil || status != 500 || string(body) != "resp" {
		t.Errorf("want error with status 500 and body, got status=%d body=%q err=%v", status, body, err)
	}
}

func TestSlack(t *testing.T) {
	srv, c := newServer(t, 200)
	s := NewSlack(httpFor(srv), "https://app.example.com/")
	s.now = func() time.Time { return time.Unix(1700000000, 500_000_000) }
	if err := s.Send(context.Background(), srv.URL, items(150)); err != nil {
		t.Fatal(err)
	}
	if len(c.bodies) != 2 {
		t.Fatalf("want 2 batches of <=100, got %d", len(c.bodies))
	}
	var payload struct {
		Attachments []map[string]any `json:"attachments"`
	}
	if err := json.Unmarshal(c.bodies[0], &payload); err != nil {
		t.Fatal(err)
	}
	if len(payload.Attachments) != 100 {
		t.Errorf("first batch size %d", len(payload.Attachments))
	}
	a := payload.Attachments[0]
	if a["title_link"] != "https://app.example.com/7/metrics" {
		t.Errorf("title_link: %v", a["title_link"])
	}
	if a["text"] != "x = 1 (> 0).\n<https://app.example.com/7/metrics|Check metrics for more details>" {
		t.Errorf("text: %v", a["text"])
	}
	if a["ts"] != 1700000000.5 {
		t.Errorf("ts: %v", a["ts"])
	}
	if c.headers[0].Get("Content-Type") != "application/json" {
		t.Error("content type")
	}
	_ = json.Unmarshal(c.bodies[1], &payload)
	if len(payload.Attachments) != 50 {
		t.Errorf("second batch size %d", len(payload.Attachments))
	}
}

func TestMSTeams(t *testing.T) {
	srv, c := newServer(t, 200)
	m := NewMSTeams(httpFor(srv), "https://app.example.com")
	if err := m.Send(context.Background(), srv.URL, items(60)); err != nil {
		t.Fatal(err)
	}
	if len(c.bodies) != 2 {
		t.Fatalf("want 2 batches of <=50, got %d", len(c.bodies))
	}
	var card map[string]any
	if err := json.Unmarshal(c.bodies[0], &card); err != nil {
		t.Fatal(err)
	}
	if card["@type"] != "MessageCard" || card["@context"] != "http://schema.org/extensions" {
		t.Errorf("card header: %v", card)
	}
	sections := card["sections"].([]any)
	if len(sections) != 99 { // 50 sections + 49 separators
		t.Errorf("want 99 sections incl. separators, got %d", len(sections))
	}
	first := sections[0].(map[string]any)
	if card["summary"] != first["activityTitle"] {
		t.Errorf("summary should be first activityTitle: %v vs %v", card["summary"], first["activityTitle"])
	}
	if first["activitySubtitle"] != "On Project *proj*" || first["markdown"] != true {
		t.Errorf("section: %v", first)
	}
	facts := first["facts"].([]any)
	if facts[0].(map[string]any)["value"] != "https://app.example.com/7/metrics" {
		t.Errorf("target fact: %v", facts[0])
	}
	if sep := sections[1].(map[string]any); sep["text"] != "***" || sep["activityTitle"] != nil {
		t.Errorf("separator: %v", sep)
	}
}

func TestWebhook(t *testing.T) {
	srv, c := newServer(t, 200)
	w := NewWebhook(httpFor(srv))
	data := map[string]any{"alertId": 1, "title": "t"}
	if err := w.Send(context.Background(), srv.URL, "Bearer x", data); err != nil {
		t.Fatal(err)
	}
	if err := w.Send(context.Background(), srv.URL, "", data); err != nil {
		t.Fatal(err)
	}
	if c.headers[0].Get("Authorization") != "Bearer x" {
		t.Error("auth header missing")
	}
	if c.headers[1].Get("Authorization") != "" {
		t.Error("auth header should be absent")
	}
	var got map[string]any
	_ = json.Unmarshal(c.bodies[0], &got)
	if got["title"] != "t" {
		t.Errorf("body: %v", got)
	}
	srv500, _ := newServer(t, 500)
	if err := NewWebhook(httpFor(srv500)).Send(context.Background(), srv500.URL, "", data); err == nil {
		t.Error("non-200 should return error")
	}
}

func TestEmailRenderAndMessage(t *testing.T) {
	e, err := NewEmail(defaultSMTP())
	if err != nil {
		t.Fatal(err)
	}
	html, err := e.Render("alert_notification.html", map[string]any{
		"Message": `"Alert A" x = 1 (> 0).`, "FrontendURL": "https://app.example.com", "ProjectID": 7, "Year": 2026,
	})
	if err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{`cid:img-0`, `&#34;Alert A&#34; x = 1 (&gt; 0).`, `https://app.example.com/7/metrics`, "2026"} {
		if !strings.Contains(html, want) {
			t.Errorf("rendered html missing %q", want)
		}
	}
	if strings.Contains(html, "<script>") || strings.Contains(html, "img/logo.png") {
		t.Error("template still has script/img placeholders")
	}
	if _, err := e.Render("missing.html", nil); err == nil {
		t.Error("unknown template should error")
	}
	raw, err := buildMessage(e.From(), "dev@example.com", "Alert A fired", html, e.logo)
	if err != nil {
		t.Fatal(err)
	}
	msg, err := mail.ReadMessage(strings.NewReader(string(raw)))
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(msg.Header.Get("Content-Type"), "multipart/related") {
		t.Errorf("content type: %s", msg.Header.Get("Content-Type"))
	}
	if msg.Header.Get("Subject") != "Alert A fired" {
		t.Errorf("subject: %s", msg.Header.Get("Subject"))
	}
	// non-ASCII subjects are RFC 2047 encoded
	rawUTF, _ := buildMessage(e.From(), "dev@example.com", "Alerte é", html, e.logo)
	if !strings.Contains(string(rawUTF), "Subject: =?utf-8?q?Alerte_=C3=A9?=") {
		t.Errorf("non-ascii subject not encoded:\n%s", string(rawUTF)[:200])
	}
	if msg.Header.Get("To") != "dev@example.com" || !strings.Contains(msg.Header.Get("From"), "do-not-reply@openreplay.com") {
		t.Errorf("headers: To=%s From=%s", msg.Header.Get("To"), msg.Header.Get("From"))
	}
	body, _ := io.ReadAll(msg.Body)
	s := string(body)
	if !strings.Contains(strings.ToLower(s), "content-id: <img-0>") || !strings.Contains(s, "Content-Type: image/png") {
		t.Error("logo part missing")
	}
	if !strings.Contains(s, "Content-Type: text/html; charset=utf-8") {
		t.Error("html part missing")
	}
}

func TestEmailNotConfigured(t *testing.T) {
	cfg := defaultSMTP()
	cfg.Host = ""
	e, err := NewEmail(cfg)
	if err != nil {
		t.Fatal(err)
	}
	if e.Configured() {
		t.Error("should not be configured")
	}
	if err := e.Send(context.Background(), "dev@example.com", "s", "<p>x</p>"); err == nil {
		t.Error("send without smtp should error")
	}
	if _, err := NewEmail(common.SMTP{From: "not an address"}); err == nil {
		t.Error("invalid EMAIL_FROM should error")
	}
}

func TestLoginAuth(t *testing.T) {
	a := &loginAuth{user: "u", password: "p"}
	mech, _, err := a.Start(nil)
	if err != nil || mech != "LOGIN" {
		t.Fatalf("start: %s %v", mech, err)
	}
	if r, _ := a.Next([]byte("Username:"), true); string(r) != "u" {
		t.Errorf("username: %q", r)
	}
	if r, _ := a.Next([]byte("Password:"), true); string(r) != "p" {
		t.Errorf("password: %q", r)
	}
	if _, err := a.Next([]byte("wat"), true); err == nil {
		t.Error("unexpected challenge should error")
	}
	if r, err := a.Next(nil, false); r != nil || err != nil {
		t.Error("done should be nil,nil")
	}
}

func TestChunk(t *testing.T) {
	if got := chunk([]int{1, 2, 3, 4, 5}, 2); len(got) != 3 || len(got[2]) != 1 {
		t.Errorf("chunk: %v", got)
	}
	if got := chunk([]int{}, 2); len(got) != 0 {
		t.Errorf("empty: %v", got)
	}
}
