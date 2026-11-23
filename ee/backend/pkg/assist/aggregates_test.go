package assist

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"
)

type nopLog struct{}

func (nopLog) Debug(context.Context, string, ...interface{}) {}
func (nopLog) Info(context.Context, string, ...interface{})  {}
func (nopLog) Warn(context.Context, string, ...interface{})  {}
func (nopLog) Error(context.Context, string, ...interface{}) {}
func (nopLog) Fatal(context.Context, string, ...interface{}) {}

type fakeAggStore struct {
	watermark, firstEvent, latest *int64
	rows                          []AggregateRow
	errs                          map[string]error

	aggStart, aggEnd int64
	latestAfter      int64
	inserts          [][]AggregateRow
	logged           []int64
}

func (f *fakeAggStore) LastWatermark(context.Context) (*int64, error) {
	return f.watermark, f.errs["watermark"]
}
func (f *fakeAggStore) FirstEvent(context.Context) (*int64, error) {
	return f.firstEvent, f.errs["first"]
}
func (f *fakeAggStore) Aggregate(_ context.Context, start, end int64, fn func(AggregateRow) error) error {
	f.aggStart, f.aggEnd = start, end
	if err := f.errs["aggregate"]; err != nil {
		return err
	}
	for _, r := range f.rows {
		if err := fn(r); err != nil {
			return err
		}
	}
	return nil
}
func (f *fakeAggStore) Insert(_ context.Context, rows []AggregateRow) error {
	cp := append([]AggregateRow(nil), rows...)
	f.inserts = append(f.inserts, cp)
	return f.errs["insert"]
}
func (f *fakeAggStore) LatestEvent(_ context.Context, after int64) (*int64, error) {
	f.latestAfter = after
	return f.latest, f.errs["latest"]
}
func (f *fakeAggStore) LogWatermark(_ context.Context, ts int64) error {
	f.logged = append(f.logged, ts)
	return f.errs["log"]
}

func i64(v int64) *int64 { return &v }

func newJob(store *fakeAggStore, now time.Time) *AggregatesJob {
	return &AggregatesJob{log: nopLog{}, store: store, now: func() time.Time { return now }}
}

func TestAggregatesJobIdentity(t *testing.T) {
	j := newJob(&fakeAggStore{}, time.Now())
	if j.Name() != "assist_events_aggregates_cron" || j.DefaultSchedule() != "@every 1h" || j.RunTimeout() <= 0 {
		t.Errorf("identity: %s %s %s", j.Name(), j.DefaultSchedule(), j.RunTimeout())
	}
}

func TestAggregatesRunFromWatermark(t *testing.T) {
	now := time.Date(2026, 10, 28, 10, 30, 15, 500_000_000, time.UTC)
	rows := make([]AggregateRow, 1203)
	for i := range rows {
		rows[i] = AggregateRow{Time: int64(i), ProjectID: 1, AgentID: 2}
	}
	store := &fakeAggStore{watermark: i64(1_000), firstEvent: i64(5), rows: rows, latest: i64(9_999)}
	if err := newJob(store, now).Run(context.Background()); err != nil {
		t.Fatal(err)
	}
	wantEnd := now.Unix() * 1000 // seconds precision, like the Python cron
	if store.aggStart != 1_001 || store.aggEnd != wantEnd {
		t.Errorf("window: got [%d, %d] want [1001, %d]", store.aggStart, store.aggEnd, wantEnd)
	}
	if len(store.inserts) != 3 || len(store.inserts[0]) != 500 || len(store.inserts[2]) != 203 {
		t.Errorf("batches: %d (%v)", len(store.inserts), batchSizes(store.inserts))
	}
	if store.latestAfter != 1_001 || len(store.logged) != 1 || store.logged[0] != 9_999 {
		t.Errorf("watermark: after=%d logged=%v", store.latestAfter, store.logged)
	}
}

func TestAggregatesRunFirstRun(t *testing.T) {
	now := time.Date(2026, 10, 28, 0, 0, 0, 0, time.UTC)
	end := now.Unix() * 1000

	// no watermark, events exist: start at the oldest event
	store := &fakeAggStore{firstEvent: i64(end - 3_600_000)}
	if err := newJob(store, now).Run(context.Background()); err != nil {
		t.Fatal(err)
	}
	if store.aggStart != end-3_600_000+1 {
		t.Errorf("start should be oldest event + 1, got %d", store.aggStart)
	}
	if len(store.inserts) != 0 || len(store.logged) != 0 {
		t.Errorf("nothing to insert or log without rows/events: %v %v", store.inserts, store.logged)
	}

	// no watermark, no events: 7-day lookback, nothing logged
	store = &fakeAggStore{}
	if err := newJob(store, now).Run(context.Background()); err != nil {
		t.Fatal(err)
	}
	if store.aggStart != end-7*24*3_600_000+1 {
		t.Errorf("start should be 7 days back + 1, got %d", store.aggStart)
	}
	if len(store.logged) != 0 {
		t.Error("no watermark should be logged without events")
	}
}

func TestAggregatesRunErrors(t *testing.T) {
	now := time.Now()
	for _, step := range []string{"watermark", "first", "aggregate", "insert", "latest", "log"} {
		store := &fakeAggStore{rows: []AggregateRow{{Time: 1}}, latest: i64(1), errs: map[string]error{step: errors.New(step + " failed")}}
		err := newJob(store, now).Run(context.Background())
		if err == nil || !strings.Contains(err.Error(), step+" failed") {
			t.Errorf("%s: error not propagated: %v", step, err)
		}
	}
	// a failing insert must not log a watermark (next run retries the window)
	store := &fakeAggStore{rows: []AggregateRow{{Time: 1}}, latest: i64(1), errs: map[string]error{"insert": errors.New("x")}}
	_ = newJob(store, now).Run(context.Background())
	if len(store.logged) != 0 {
		t.Error("watermark logged despite failed insert")
	}
}

func TestBuildAggregatesInsert(t *testing.T) {
	sql, args := buildAggregatesInsert([]AggregateRow{
		{Time: 1, ProjectID: 2, AgentID: 3, AssistAvg: 4, CallAvg: 5, ControlAvg: 6, AssistTotal: 7, CallTotal: 8, ControlTotal: 9},
		{Time: 10, ProjectID: 20, AgentID: 30},
	})
	if len(args) != 18 || args[0] != int64(1) || args[8] != int64(9) || args[9] != int64(10) {
		t.Errorf("args: %v", args)
	}
	for _, p := range []string{"INSERT INTO public.assist_events_aggregates", "($1, $2, $3, $4, $5, $6, $7, $8, $9)", "($10, $11, $12, $13, $14, $15, $16, $17, $18)"} {
		if !strings.Contains(sql, p) {
			t.Errorf("sql missing %q:\n%s", p, sql)
		}
	}
	if strings.Count(sql, "(") != 3 { // column list + 2 rows
		t.Errorf("unexpected value groups:\n%s", sql)
	}
}

func TestAggregateSQLShape(t *testing.T) {
	for _, p := range []string{"FROM public.assist_events", "timestamp BETWEEN @start AND @end", "agent_id IS NOT NULL",
		"date_trunc('hour'", "GROUP BY time, project_id, agent_id", "ORDER BY time", "event_type = 'control'"} {
		if !strings.Contains(aggregateSQL, p) {
			t.Errorf("aggregateSQL missing %q", p)
		}
	}
}

func batchSizes(b [][]AggregateRow) []int {
	out := make([]int, len(b))
	for i := range b {
		out[i] = len(b[i])
	}
	return out
}
