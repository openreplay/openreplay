package db

import (
	"context"
	"time"

	"openreplay/backend/internal/config/db"
	"openreplay/backend/internal/db/datasaver"
	"openreplay/backend/internal/service"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/memory"
	"openreplay/backend/pkg/queue/types"
	"openreplay/backend/pkg/sessions"
)

type dbImpl struct {
	log      logger.Logger
	cfg      *db.Config
	ctx      context.Context
	consumer types.Consumer
	saver    datasaver.Saver
	mm       memory.Manager
	sessions sessions.Sessions
	done     chan struct{}
	finished chan struct{}
}

func New(log logger.Logger, cfg *db.Config, consumer types.Consumer, saver datasaver.Saver, mm memory.Manager, sessions sessions.Sessions) service.Interface {
	s := &dbImpl{
		log:      log,
		cfg:      cfg,
		ctx:      context.Background(),
		consumer: consumer,
		saver:    saver,
		mm:       mm,
		sessions: sessions,
		done:     make(chan struct{}),
		finished: make(chan struct{}),
	}
	go s.run()
	return s
}

func (d *dbImpl) run() {
	sessionsCommitTick := time.Tick(time.Second * 3)
	commitTick := time.Tick(d.cfg.CommitBatchTimeout)
	for {
		select {
		case <-sessionsCommitTick:
			d.sessions.Commit()
		case <-commitTick:
			d.commit()
		case msg := <-d.consumer.Rebalanced():
			d.log.Info(d.ctx, "Rebalanced: %v", msg)
		case <-d.done:
			d.commit()
			if err := d.saver.Close(); err != nil {
				d.log.Error(d.ctx, "saver.Close error: %s", err)
			}
			d.consumer.Close()
			d.finished <- struct{}{}
		default:
			if !d.mm.HasFreeMemory() {
				continue
			}
			if err := d.consumer.ConsumeNext(); err != nil {
				d.log.Fatal(d.ctx, "Error on consumption: %v", err)
			}
		}
	}
}

func (d *dbImpl) commit() {
	d.saver.Commit()
	d.sessions.Commit()
	d.consumer.Commit()
}

func (d *dbImpl) Stop() {
	d.done <- struct{}{}
	<-d.finished
}
