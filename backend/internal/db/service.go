package db

import (
	"context"
	"time"

	"openreplay/backend/internal/config/db"
	"openreplay/backend/internal/db/datasaver"
	"openreplay/backend/internal/service"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/queue/types"
	"openreplay/backend/pkg/sessions"
)

type dbImpl struct {
	log        logger.Logger
	cfg        *db.Config
	ctx        context.Context
	consumer   types.Consumer
	saver      datasaver.Saver
	sessions   sessions.Sessions
	done       chan struct{}
	finished   chan struct{}
	commitDone chan struct{}
}

func New(log logger.Logger, cfg *db.Config, consumer types.Consumer, saver datasaver.Saver, sessions sessions.Sessions) service.Interface {
	s := &dbImpl{
		log:        log,
		cfg:        cfg,
		ctx:        context.Background(),
		consumer:   consumer,
		saver:      saver,
		sessions:   sessions,
		done:       make(chan struct{}),
		finished:   make(chan struct{}),
		commitDone: make(chan struct{}),
	}
	go s.run()
	go s.sessionsCommitLoop()
	return s
}

func (d *dbImpl) sessionsCommitLoop() {
	tick := time.NewTicker(time.Second * 3)
	defer tick.Stop()
	for {
		select {
		case <-tick.C:
			d.sessions.Commit()
		case <-d.commitDone:
			return
		}
	}
}

func (d *dbImpl) run() {
	commitTick := time.Tick(d.cfg.CommitBatchTimeout)
	for {
		select {
		case <-commitTick:
			d.commit()
		case <-d.done:
			close(d.commitDone) // stop the background sessions flusher
			d.commit()
			d.sessions.Commit() // final PG flush
			if err := d.saver.Close(); err != nil {
				d.log.Error(d.ctx, "saver.Close error: %s", err)
			}
			d.consumer.Close()
			d.finished <- struct{}{}
		default:
			if err := d.consumer.ConsumeNext(); err != nil {
				d.log.Fatal(d.ctx, "Error on consumption: %v", err)
			}
		}
	}
}

func (d *dbImpl) commit() {
	d.saver.Commit()
}

func (d *dbImpl) Stop() {
	d.done <- struct{}{}
	<-d.finished
}
