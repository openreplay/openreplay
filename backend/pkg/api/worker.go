package api

import (
	"context"
	"sync"
	"time"

	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/queue/types"
)

const (
	consumerCommitInterval = 30 * time.Second
	consumerErrorBackoff   = time.Second
)

type consumerWorker struct {
	log      logger.Logger
	consumer types.Consumer
	stop     chan struct{}
	once     sync.Once
}

func newConsumerWorker(log logger.Logger, consumer types.Consumer) *consumerWorker {
	return &consumerWorker{
		log:      log,
		consumer: consumer,
		stop:     make(chan struct{}),
	}
}

func (w *consumerWorker) Run() {
	ctx := context.Background()
	commit := time.NewTicker(consumerCommitInterval)
	defer commit.Stop()
	for {
		select {
		case <-w.stop:
			w.consumer.Close()
			return
		case <-commit.C:
			if err := w.consumer.Commit(); err != nil {
				w.log.Error(ctx, "can't commit messages: %s", err)
			}
		default:
			if err := w.consumer.ConsumeNext(); err != nil {
				w.log.Error(ctx, "can't consume next message: %s", err)
				select {
				case <-w.stop:
				case <-time.After(consumerErrorBackoff):
				}
			}
		}
	}
}

func (w *consumerWorker) Stop() {
	w.once.Do(func() { close(w.stop) })
}
