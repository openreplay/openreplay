package favorite

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	"github.com/aws/aws-sdk-go/aws/awserr"

	"openreplay/backend/pkg/objectstorage"
)

func TestRetry(t *testing.T) {
	boom := errors.New("boom")
	tests := []struct {
		name      string
		failFirst int
		wantCalls int
		wantFails int
		wantErr   bool
	}{
		{"first try", 0, 1, 0, false},
		{"succeeds on attempt 2", 1, 2, 1, false},
		{"fails after 3", 5, 3, 3, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			calls, fails := 0, 0
			err := retry(context.Background(), 3, time.Millisecond, time.Second, func(context.Context) error {
				calls++
				if calls <= tt.failFirst {
					return boom
				}
				return nil
			}, func(int, error) { fails++ })
			if calls != tt.wantCalls || fails != tt.wantFails || (err != nil) != tt.wantErr {
				t.Errorf("calls=%d fails=%d err=%v", calls, fails, err)
			}
		})
	}
}

func TestRetryStopsOnCancelledContext(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	calls := 0
	err := retry(ctx, 3, time.Hour, time.Second, func(context.Context) error {
		calls++
		return errors.New("x")
	}, func(int, error) {})
	if calls != 1 || err == nil {
		t.Errorf("calls=%d err=%v", calls, err)
	}
}

func TestRetryPerAttemptDeadline(t *testing.T) {
	var deadlines []time.Time
	_ = retry(context.Background(), 3, time.Millisecond, time.Second, func(ctx context.Context) error {
		d, ok := ctx.Deadline()
		if !ok {
			t.Fatal("attempt context has no deadline")
		}
		deadlines = append(deadlines, d)
		return errors.New("x")
	}, func(int, error) {})
	if len(deadlines) != 3 || !deadlines[1].After(deadlines[0]) || !deadlines[2].After(deadlines[1]) {
		t.Errorf("deadlines not fresh per attempt: %v", deadlines)
	}
}

func TestCoalescerSerializesAndCoalesces(t *testing.T) {
	c := newCoalescer()
	started := make(chan struct{})
	release := make(chan struct{})
	var mu sync.Mutex
	var runs int
	var running, maxRunning int32
	apply := func() {
		n := atomic.AddInt32(&running, 1)
		if n > atomic.LoadInt32(&maxRunning) {
			atomic.StoreInt32(&maxRunning, n)
		}
		mu.Lock()
		runs++
		first := runs == 1
		mu.Unlock()
		if first {
			close(started)
			<-release
		}
		atomic.AddInt32(&running, -1)
	}
	c.submit("k", apply)
	<-started
	c.submit("k", apply)
	c.submit("k", apply)
	close(release)
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if err := c.wait(ctx); err != nil {
		t.Fatal(err)
	}
	if runs != 2 {
		t.Errorf("runs=%d, want 2", runs)
	}
	if maxRunning != 1 {
		t.Errorf("maxRunning=%d, want 1", maxRunning)
	}
	if len(c.running) != 0 {
		t.Errorf("running not cleaned: %v", c.running)
	}
}

func TestCoalescerIndependentKeys(t *testing.T) {
	c := newCoalescer()
	var wg sync.WaitGroup
	wg.Add(2)
	c.submit("a", func() { wg.Done() })
	c.submit("b", func() { wg.Done() })
	wg.Wait()
}

func TestCoalescerRecoversFromPanic(t *testing.T) {
	c := newCoalescer()
	var recovered int32
	c.onPanic = func(string, interface{}) { atomic.AddInt32(&recovered, 1) }
	c.submit("k", func() { panic("boom") })
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if err := c.wait(ctx); err != nil {
		t.Fatal(err)
	}
	if recovered != 1 {
		t.Errorf("recovered=%d", recovered)
	}
	done := make(chan struct{})
	c.submit("k", func() { close(done) })
	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatal("key stuck after panic")
	}
}

func TestCoalescerWaitHonorsContext(t *testing.T) {
	c := newCoalescer()
	block := make(chan struct{})
	c.submit("k", func() { <-block })
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Millisecond)
	defer cancel()
	if err := c.wait(ctx); err == nil {
		t.Error("expected deadline error")
	}
	close(block)
}

func TestSemaphoreCap(t *testing.T) {
	sem := make(chan struct{}, 2)
	var running, maxRunning int32
	var wg sync.WaitGroup
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if !acquire(context.Background(), sem) {
				t.Error("acquire failed")
				return
			}
			defer release(sem)
			n := atomic.AddInt32(&running, 1)
			for {
				m := atomic.LoadInt32(&maxRunning)
				if n <= m || atomic.CompareAndSwapInt32(&maxRunning, m, n) {
					break
				}
			}
			time.Sleep(5 * time.Millisecond)
			atomic.AddInt32(&running, -1)
		}()
	}
	wg.Wait()
	if maxRunning > 2 {
		t.Errorf("maxRunning=%d, want <=2", maxRunning)
	}
}

func TestAcquireHonorsContext(t *testing.T) {
	sem := make(chan struct{}, 1)
	sem <- struct{}{}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Millisecond)
	defer cancel()
	if acquire(ctx, sem) {
		t.Error("acquire should fail when full and context expires")
	}
}

type fakeStorage struct {
	objectstorage.ObjectStorage
	tagErr map[string]error
	tagged []string
}

func (f *fakeStorage) Tag(fileKey, tagKey, tagValue string) error {
	f.tagged = append(f.tagged, fileKey)
	return f.tagErr[fileKey]
}

func TestIsNotFound(t *testing.T) {
	tests := []struct {
		name string
		err  error
		want bool
	}{
		{"aws NoSuchKey", awserr.NewRequestFailure(awserr.New("NoSuchKey", "x", nil), 404, "r"), true},
		{"aws 404 other code", awserr.NewRequestFailure(awserr.New("Other", "x", nil), 404, "r"), false},
		{"aws NoSuchBucket 404", awserr.NewRequestFailure(awserr.New("NoSuchBucket", "x", nil), 404, "r"), false},
		{"aws NotFound code", awserr.New("NotFound", "x", nil), true},
		{"aws 500", awserr.NewRequestFailure(awserr.New("InternalError", "x", nil), 500, "r"), false},
		{"azure BlobNotFound", &azcore.ResponseError{StatusCode: 404, ErrorCode: "BlobNotFound"}, true},
		{"azure ContainerNotFound", &azcore.ResponseError{StatusCode: 404, ErrorCode: "ContainerNotFound"}, false},
		{"azure bare 404", &azcore.ResponseError{StatusCode: 404}, false},
		{"azure 500", &azcore.ResponseError{StatusCode: 500}, false},
		{"wrapped aws", fmt.Errorf("w: %w", awserr.New("NoSuchKey", "x", nil)), true},
		{"generic", errors.New("nope"), false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := isNotFound(tt.err); got != tt.want {
				t.Errorf("got %v want %v", got, tt.want)
			}
		})
	}
}

func TestSetTags(t *testing.T) {
	notFound := awserr.NewRequestFailure(awserr.New("NoSuchKey", "x", nil), 404, "r")
	noBucket := awserr.NewRequestFailure(awserr.New("NoSuchBucket", "x", nil), 404, "r")
	real := errors.New("network down")
	tests := []struct {
		name    string
		tagErr  map[string]error
		wantErr bool
	}{
		{"all ok", nil, false},
		{"missing objects ignored", map[string]error{"7/dom.mobe": notFound, "7/devtools.mob": notFound}, false},
		{"missing bucket reported", map[string]error{"7/dom.mobs": noBucket}, true},
		{"real failure reported", map[string]error{"7/dom.mobs": real}, true},
		{"real failure alongside not found", map[string]error{"7/dom.mobe": notFound, "7/devtools.mob": real}, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			st := &fakeStorage{tagErr: tt.tagErr}
			err := setTags(context.Background(), st, 7, true)
			if (err != nil) != tt.wantErr {
				t.Errorf("err=%v wantErr=%v", err, tt.wantErr)
			}
			if len(st.tagged) != 3 {
				t.Errorf("tagged=%v, want all 3 attempted", st.tagged)
			}
		})
	}
	if err := setTags(context.Background(), nil, 7, true); err != nil {
		t.Errorf("nil storage: %v", err)
	}
}

type hangStorage struct {
	objectstorage.ObjectStorage
	block chan struct{}
}

func (h *hangStorage) Tag(string, string, string) error {
	<-h.block
	return nil
}

func TestSetTagsHungCallReleasedByContext(t *testing.T) {
	st := &hangStorage{block: make(chan struct{})}
	defer close(st.block)
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Millisecond)
	defer cancel()
	done := make(chan error, 1)
	go func() { done <- setTags(ctx, st, 7, true) }()
	select {
	case err := <-done:
		if err == nil {
			t.Error("expected context error")
		}
	case <-time.After(2 * time.Second):
		t.Fatal("setTags did not return after context expiry")
	}
}
