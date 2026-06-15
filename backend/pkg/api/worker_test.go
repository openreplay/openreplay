package api

import (
	"context"
	"errors"
	"sync/atomic"
	"testing"
	"time"

	"openreplay/backend/pkg/logger"
)

type fakeConsumer struct {
	consumeCalls int32
	closed       int32
	consumeErr   error
}

func (f *fakeConsumer) ConsumeNext() error {
	atomic.AddInt32(&f.consumeCalls, 1)
	return f.consumeErr
}
func (f *fakeConsumer) CommitBack(gap int64) error     { return nil }
func (f *fakeConsumer) Commit() error                  { return nil }
func (f *fakeConsumer) Ping(ctx context.Context) error { return nil }
func (f *fakeConsumer) Close()                         { atomic.StoreInt32(&f.closed, 1) }

func TestConsumerWorker_ConsumesThenStopsAndCloses(t *testing.T) {
	fc := &fakeConsumer{}
	w := newConsumerWorker(logger.New(), fc)

	done := make(chan struct{})
	go func() { w.Run(); close(done) }()

	deadline := time.After(2 * time.Second)
	for atomic.LoadInt32(&fc.consumeCalls) == 0 {
		select {
		case <-deadline:
			t.Fatal("worker never called ConsumeNext")
		default:
			time.Sleep(time.Millisecond)
		}
	}

	w.Stop()

	select {
	case <-done:
	case <-time.After(2 * time.Second):
		t.Fatal("worker did not return after Stop")
	}

	if atomic.LoadInt32(&fc.closed) != 1 {
		t.Fatal("consumer was not closed on Stop")
	}
}

func TestConsumerWorker_StopInterruptsErrorBackoff(t *testing.T) {
	fc := &fakeConsumer{consumeErr: errors.New("broker down")}
	w := newConsumerWorker(logger.New(), fc)

	done := make(chan struct{})
	go func() { w.Run(); close(done) }()

	deadline := time.After(2 * time.Second)
	for atomic.LoadInt32(&fc.consumeCalls) == 0 {
		select {
		case <-deadline:
			t.Fatal("worker never called ConsumeNext")
		default:
			time.Sleep(time.Millisecond)
		}
	}

	w.Stop()

	select {
	case <-done:
	case <-time.After(consumerErrorBackoff / 2):
		t.Fatal("worker did not return promptly while backing off")
	}

	if atomic.LoadInt32(&fc.closed) != 1 {
		t.Fatal("consumer was not closed on Stop")
	}
}
