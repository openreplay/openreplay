package alerts

import (
	"context"
	"sync"
	"testing"

	"openreplay/backend/pkg/senders"
)

func TestFormatValue(t *testing.T) {
	cases := map[float64]string{
		0: "0", 7: "7", 1234: "1,234", 1234567: "1,234,567", -1234: "-1,234",
		0.5: "0.5", 1234.567: "1,234.57", 2.999: "3", 1234.5: "1,234.5",
	}
	for in, want := range cases {
		if got := formatValue(in); got != want {
			t.Errorf("formatValue(%v) = %q, want %q", in, got, want)
		}
	}
}

func sampleAlert() *AlertToExecute {
	return &AlertToExecute{
		AlertID: 11, TenantID: -1, ProjectID: 7, ProjectName: "proj", Name: "Too many errors",
		DetectionMethod: DetectionThreshold, SeriesName: "errors.javascript.count",
		Query:   QueryToExecute{Left: "errors.javascript.count", Operator: OpGt, Right: 10},
		Options: OptionsToExecute{CurrentPeriod: 15, PreviousPeriod: 15, Message: []MessageToExecute{{Type: "slack", Value: "3"}}},
	}
}

func TestBuildNotification(t *testing.T) {
	n := NewNotifier(nil, nil, Senders{}).Build(sampleAlert(), Result{Value: 1234.5, Valid: true}, 999)
	if n.Description != "errors.javascript.count = 1,234.5 (> 10)." {
		t.Errorf("description: %s", n.Description)
	}
	if n.ButtonURL != "/7/metrics" || n.ButtonText != "Check metrics for more details" || n.Title != "Too many errors" {
		t.Errorf("button/title: %+v", n)
	}
	for _, k := range []string{"message", "data"} {
		if _, ok := n.StoredOptions[k]; ok {
			t.Errorf("stored options must not contain %q", k)
		}
	}
	if n.StoredOptions["source"] != "ALERT" || n.StoredOptions["sourceId"] != int64(11) || n.StoredOptions["sourceMeta"] != DetectionThreshold {
		t.Errorf("stored options: %v", n.StoredOptions)
	}
	d := n.WebhookData
	if d["limitValue"] != 10.0 || d["actualValue"] != 1234.5 || d["operator"] != ">" || d["trigger"] != "errors.javascript.count" || d["createdAt"] != int64(999) {
		t.Errorf("webhook data: %v", d)
	}
}

// ---- fakes ----

type fakeStore struct {
	mu            sync.Mutex
	alerts        []AlertToExecute
	alertsErr     error
	marked        []int64
	markErr       error
	inserted      []Notification
	webhooks      map[int64]Webhook
	webhookTenant []int64
	calls         []string
}

func (f *fakeStore) ActiveAlerts(context.Context) ([]AlertToExecute, error) {
	f.calls = append(f.calls, "active")
	return f.alerts, f.alertsErr
}
func (f *fakeStore) MarkNotified(_ context.Context, ids []int64, _ int64) error {
	f.calls = append(f.calls, "mark")
	f.marked = append(f.marked, ids...)
	return f.markErr
}
func (f *fakeStore) InsertNotifications(_ context.Context, ns []Notification) error {
	f.calls = append(f.calls, "insert")
	f.inserted = append(f.inserted, ns...)
	return nil
}
func (f *fakeStore) Webhooks(_ context.Context, ids []int64, tenant int64) (map[int64]Webhook, error) {
	f.calls = append(f.calls, "webhooks")
	f.webhookTenant = append(f.webhookTenant, tenant)
	out := map[int64]Webhook{}
	for _, id := range ids {
		if h, ok := f.webhooks[id]; ok {
			out[id] = h
		}
	}
	return out, nil
}

type fakeChannel struct {
	mu    sync.Mutex
	calls []struct {
		endpoint string
		items    []senders.Item
	}
	hooks []struct {
		endpoint, auth string
		data           map[string]any
	}
	emails []string
	err    error
}

func (f *fakeChannel) Send(_ context.Context, endpoint string, items []senders.Item) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.calls = append(f.calls, struct {
		endpoint string
		items    []senders.Item
	}{endpoint, items})
	return f.err
}

type fakeWebhookSender struct{ fakeChannel }

func (f *fakeWebhookSender) Send(_ context.Context, endpoint, auth string, data map[string]any) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.hooks = append(f.hooks, struct {
		endpoint, auth string
		data           map[string]any
	}{endpoint, auth, data})
	return f.err
}

type fakeEmail struct {
	fakeChannel
	configured bool
}

func (f *fakeEmail) Configured() bool { return f.configured }
func (f *fakeEmail) Send(_ context.Context, to string, _ senders.Item) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.emails = append(f.emails, to)
	return f.err
}

type nopLogger struct{}

func (nopLogger) Debug(context.Context, string, ...interface{}) {}
func (nopLogger) Info(context.Context, string, ...interface{})  {}
func (nopLogger) Warn(context.Context, string, ...interface{})  {}
func (nopLogger) Error(context.Context, string, ...interface{}) {}
func (nopLogger) Fatal(context.Context, string, ...interface{}) {}

func TestDispatch(t *testing.T) {
	auth := "Bearer t"
	store := &fakeStore{webhooks: map[int64]Webhook{
		1: {WebhookID: 1, Endpoint: "https://slack/1", Type: "slack"},
		2: {WebhookID: 2, Endpoint: "https://teams/2", Type: "msteams"},
		3: {WebhookID: 3, Endpoint: "https://hook/3", Type: "webhook", AuthHeader: &auth},
		4: {WebhookID: 4, Endpoint: "https://slack/4", Type: "msteams"}, // wrong type for slack
	}}
	slack, teams, hook, email := &fakeChannel{}, &fakeChannel{}, &fakeWebhookSender{}, &fakeEmail{configured: true}
	n := NewNotifier(nopLogger{}, store, Senders{Slack: slack, MSTeams: teams, Webhook: hook, Email: email})

	a := sampleAlert()
	a.Options.Message = []MessageToExecute{
		{Type: "slack", Value: "1"}, {Type: "slack", Value: "4"}, {Type: "slack", Value: "x"}, {Type: "slack", Value: "99"},
		{Type: "msteams", Value: "2"}, {Type: "webhook", Value: "3"}, {Type: "email", Value: "a@b.c"}, {Type: "sms", Value: "?"},
	}
	n1 := n.Build(a, Result{Value: 11, Valid: true}, 1)
	b := sampleAlert()
	b.AlertID = 12
	b.Options.Message = []MessageToExecute{{Type: "slack", Value: "1"}}
	n2 := n.Build(b, Result{Value: 12, Valid: true}, 1)

	n.Dispatch(context.Background(), []Notification{n1, n2})

	if len(store.inserted) != 2 {
		t.Errorf("want 2 inserted notifications, got %d", len(store.inserted))
	}
	if len(slack.calls) != 1 || slack.calls[0].endpoint != "https://slack/1" || len(slack.calls[0].items) != 2 {
		t.Errorf("slack: %+v", slack.calls)
	}
	if len(teams.calls) != 1 || teams.calls[0].endpoint != "https://teams/2" {
		t.Errorf("teams: %+v", teams.calls)
	}
	if len(hook.hooks) != 1 || hook.hooks[0].auth != "Bearer t" || hook.hooks[0].data["alertId"] != int64(11) {
		t.Errorf("webhook: %+v", hook.hooks)
	}
	if len(email.emails) != 1 || email.emails[0] != "a@b.c" {
		t.Errorf("email: %v", email.emails)
	}
	for _, tenant := range store.webhookTenant {
		if tenant != -1 {
			t.Errorf("tenant passed to Webhooks: %d", tenant)
		}
	}
	// email not configured -> skipped silently
	email2 := &fakeEmail{configured: false}
	n = NewNotifier(nopLogger{}, store, Senders{Email: email2})
	n.Dispatch(context.Background(), []Notification{n1})
	if len(email2.emails) != 0 {
		t.Error("email should be skipped when smtp is not configured")
	}
	// empty dispatch does nothing
	store2 := &fakeStore{}
	NewNotifier(nopLogger{}, store2, Senders{}).Dispatch(context.Background(), nil)
	if len(store2.calls) != 0 {
		t.Error("empty dispatch should not touch storage")
	}
}
