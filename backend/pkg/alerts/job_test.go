package alerts

import (
	"context"
	"errors"
	"testing"
	"time"
)

type fakeEvaluator struct {
	results map[int64]Result
	errs    map[int64]error
	calls   []int64
}

func (f *fakeEvaluator) Evaluate(_ context.Context, a *AlertToExecute, _ int64) (Result, error) {
	f.calls = append(f.calls, a.AlertID)
	if err := f.errs[a.AlertID]; err != nil {
		return Result{}, err
	}
	return f.results[a.AlertID], nil
}

type fakeNotifier struct {
	built      []int64
	dispatched []Notification
	calls      *[]string
}

func (f *fakeNotifier) Build(a *AlertToExecute, r Result, nowMs int64) Notification {
	f.built = append(f.built, a.AlertID)
	return Notification{AlertID: a.AlertID}
}
func (f *fakeNotifier) Dispatch(_ context.Context, ns []Notification) {
	*f.calls = append(*f.calls, "dispatch")
	f.dispatched = append(f.dispatched, ns...)
}

func TestJobRun(t *testing.T) {
	const createdAt int64 = 1_700_000_000_000
	now := time.UnixMilli(createdAt + 3*minuteMs) // on tick for 15-minute periods
	mk := func(id int64, left string) AlertToExecute {
		a := *sampleAlert()
		a.AlertID = id
		a.CreatedAt = createdAt
		a.Query.Left = left
		return a
	}
	offTick := mk(5, "errors.backend.count")
	offTick.CreatedAt = createdAt + 90_000
	store := &fakeStore{alerts: []AlertToExecute{
		mk(1, "errors.javascript.count"),  // fires
		mk(2, "errors.backend.count"),     // does not fire
		mk(3, "performance.ttfb.average"), // evaluation error
		mk(4, "resources.missing.count"),  // unsupported metric
		offTick,                           // not due
		mk(6, "properties.cart_total"),    // property alert, evaluated, does not fire
	}}
	eval := &fakeEvaluator{
		results: map[int64]Result{1: {Value: 11, Valid: true}, 2: {Value: 1, Valid: false}, 6: {Value: 2, Valid: false}},
		errs:    map[int64]error{3: errors.New("ch down")},
	}
	notifier := &fakeNotifier{calls: &store.calls}
	j := &Job{log: nopLogger{}, store: store, eval: eval, notifier: notifier, now: func() time.Time { return now }}

	if err := j.Run(context.Background()); err != nil {
		t.Fatal(err)
	}
	if len(eval.calls) != 4 {
		t.Errorf("want alerts 1,2,3,6 evaluated, got %v", eval.calls)
	}
	if len(notifier.built) != 1 || notifier.built[0] != 1 {
		t.Errorf("built: %v", notifier.built)
	}
	if len(store.marked) != 1 || store.marked[0] != 1 {
		t.Errorf("marked: %v", store.marked)
	}
	// MarkNotified must precede Dispatch
	var order []string
	for _, c := range store.calls {
		if c == "mark" || c == "dispatch" {
			order = append(order, c)
		}
	}
	if len(order) != 2 || order[0] != "mark" || order[1] != "dispatch" {
		t.Errorf("call order: %v", store.calls)
	}

	// nothing fires -> nothing written
	store2 := &fakeStore{alerts: []AlertToExecute{mk(2, "errors.backend.count")}}
	notifier2 := &fakeNotifier{calls: &store2.calls}
	j2 := &Job{log: nopLogger{}, store: store2, eval: eval, notifier: notifier2, now: func() time.Time { return now }}
	if err := j2.Run(context.Background()); err != nil {
		t.Fatal(err)
	}
	if len(store2.marked) != 0 || len(notifier2.dispatched) != 0 {
		t.Error("no alert fired but storage/dispatch was touched")
	}

	// fetch error is fatal for the tick
	j3 := &Job{log: nopLogger{}, store: &fakeStore{alertsErr: errors.New("pg down")}, eval: eval, notifier: notifier, now: time.Now}
	if err := j3.Run(context.Background()); err == nil {
		t.Error("fetch error should be returned")
	}
	// mark error is returned and dispatch skipped
	store4 := &fakeStore{alerts: []AlertToExecute{mk(1, "errors.javascript.count")}, markErr: errors.New("pg down")}
	notifier4 := &fakeNotifier{calls: &store4.calls}
	j4 := &Job{log: nopLogger{}, store: store4, eval: eval, notifier: notifier4, now: func() time.Time { return now }}
	if err := j4.Run(context.Background()); err == nil || len(notifier4.dispatched) != 0 {
		t.Errorf("mark error: err=%v dispatched=%d", err, len(notifier4.dispatched))
	}
	if j.Name() != "alerts" || j.DefaultSchedule() != "* * * * *" {
		t.Error("job identity")
	}
}
