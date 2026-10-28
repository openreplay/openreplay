package telemetry

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"testing"
)

type nopLog struct{}

func (nopLog) Debug(context.Context, string, ...interface{}) {}
func (nopLog) Info(context.Context, string, ...interface{})  {}
func (nopLog) Warn(context.Context, string, ...interface{})  {}
func (nopLog) Error(context.Context, string, ...interface{}) {}
func (nopLog) Fatal(context.Context, string, ...interface{}) {}

type fakeStore struct {
	rows []TenantStats
	err  error
}

func (f *fakeStore) Compute(context.Context) ([]TenantStats, error) { return f.rows, f.err }

type fakeSender struct {
	sent [][]Stat
	err  error
}

func (f *fakeSender) Send(_ context.Context, stats []Stat) error {
	f.sent = append(f.sent, stats)
	return f.err
}

func str(s string) *string { return &s }

func TestJobIdentity(t *testing.T) {
	j := NewJob(nopLog{}, nil, "")
	if j.Name() != "telemetry_cron" || j.DefaultSchedule() != "0 0 * * *" || j.RunTimeout() <= 0 {
		t.Errorf("identity: %s %s %s", j.Name(), j.DefaultSchedule(), j.RunTimeout())
	}
	if j.sender.(*httpSender).endpoint != DefaultEndpoint {
		t.Errorf("empty endpoint should fall back to the default")
	}
}

func TestToStat(t *testing.T) {
	in := TenantStats{Name: "Acme", Integrations: 3, Projects: 2, Sessions: 500, Users: 7, TenantKey: "key1", Version: "v1.2.3", OwnerEmail: str("o@acme.io")}
	got := toStat(in)
	raw, _ := json.Marshal(got)
	var m map[string]any
	_ = json.Unmarshal(raw, &m)
	want := map[string]any{
		"edition": edition, "tracking": false, "version": "v1.2.3", "user_id": "key1", "tenant_key": "key1",
		"owner_email": "o@acme.io", "organization_name": "Acme",
		"users_count": float64(7), "projects_count": float64(2), "sessions_count": float64(500), "integrations_count": float64(3),
	}
	for k, v := range want {
		if m[k] != v {
			t.Errorf("%s: got %v want %v", k, m[k], v)
		}
	}
	if len(m) != len(want) {
		t.Errorf("unexpected keys: %v", m)
	}

	// opt-out withholds identity but keeps the counters
	in.OptOut = true
	raw, _ = json.Marshal(toStat(in))
	_ = json.Unmarshal(raw, &m)
	if m["tracking"] != true || m["owner_email"] != nil || m["organization_name"] != nil || m["sessions_count"] != float64(500) {
		t.Errorf("opt-out: %s", raw)
	}
	// nil owner e-mail stays null
	in.OptOut, in.OwnerEmail = false, nil
	raw, _ = json.Marshal(toStat(in))
	if !strings.Contains(string(raw), `"owner_email":null`) {
		t.Errorf("nil owner e-mail: %s", raw)
	}
}

func TestJobRun(t *testing.T) {
	store := &fakeStore{rows: []TenantStats{{Name: "a", TenantKey: "k1"}, {Name: "b", TenantKey: "k2", OptOut: true}}}
	sender := &fakeSender{}
	j := &Job{log: nopLog{}, store: store, sender: sender}
	if err := j.Run(context.Background()); err != nil {
		t.Fatal(err)
	}
	if len(sender.sent) != 1 || len(sender.sent[0]) != 2 || sender.sent[0][1].OrganizationName != nil {
		t.Errorf("sent: %+v", sender.sent)
	}

	// nothing to report: no request
	sender = &fakeSender{}
	j = &Job{log: nopLog{}, store: &fakeStore{}, sender: sender}
	if err := j.Run(context.Background()); err != nil || len(sender.sent) != 0 {
		t.Errorf("empty: err=%v sent=%v", err, sender.sent)
	}

	// errors propagate
	if err := (&Job{log: nopLog{}, store: &fakeStore{err: errors.New("pg down")}, sender: &fakeSender{}}).Run(context.Background()); err == nil {
		t.Error("store error should propagate")
	}
	if err := (&Job{log: nopLog{}, store: store, sender: &fakeSender{err: errors.New("http 500")}}).Run(context.Background()); err == nil {
		t.Error("sender error should propagate")
	}
}

func TestComputeSQLShape(t *testing.T) {
	for _, p := range []string{"UPDATE public.tenants", "t_integrations", "t_projects", "= t_sessions + COALESCE(", "t_users", "last_telemetry",
		"openreplay_version()", "RETURNING name, t_integrations, t_projects, t_sessions, t_users, tenant_key, opt_out"} {
		if !strings.Contains(computeSQL, p) {
			t.Errorf("computeSQL missing %q", p)
		}
	}
}
