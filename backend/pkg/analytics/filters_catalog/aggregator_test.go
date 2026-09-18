package filters_catalog

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"
)

func TestRunCancelOnFirstErrorCancelsSiblings(t *testing.T) {
	failErr := errors.New("boom")

	done := make(chan error, 1)
	observed := make(chan error, 1)

	go func() {
		done <- runCancelOnFirstError(context.Background(),
			labeledFilterFunc{"failing", func(ctx context.Context) error {
				return failErr
			}},
			labeledFilterFunc{"sibling", func(ctx context.Context) error {
				select {
				case <-ctx.Done():
					observed <- ctx.Err()
					return ctx.Err()
				case <-time.After(2 * time.Second):
					observed <- errors.New("sibling timed out waiting for cancellation")
					return errors.New("sibling timed out")
				}
			}},
		)
	}()

	select {
	case err := <-done:
		if !errors.Is(err, failErr) {
			t.Fatalf("expected first error to win, got %v", err)
		}
	case <-time.After(3 * time.Second):
		t.Fatalf("runCancelOnFirstError did not return in time")
	}

	select {
	case obsErr := <-observed:
		if obsErr == nil {
			t.Fatalf("expected sibling to observe a cancelled context")
		}
		if !errors.Is(obsErr, context.Canceled) {
			t.Fatalf("expected sibling to observe context cancellation, got %v", obsErr)
		}
	case <-time.After(3 * time.Second):
		t.Fatalf("sibling never reported")
	}
}

func TestRunCancelOnFirstErrorNoErrors(t *testing.T) {
	err := runCancelOnFirstError(context.Background(),
		labeledFilterFunc{"a", func(ctx context.Context) error { return nil }},
		labeledFilterFunc{"b", func(ctx context.Context) error { return nil }},
	)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
}

func TestRunCancelOnFirstErrorRecoversPanic(t *testing.T) {
	err := runCancelOnFirstError(context.Background(),
		labeledFilterFunc{"segments catalog", func(ctx context.Context) error { panic("kaboom") }},
	)
	if err == nil {
		t.Fatalf("expected panic to surface as error")
	}
	if !strings.Contains(err.Error(), "segments catalog") {
		t.Fatalf("expected error to attribute the panic to its label, got %v", err)
	}
}
