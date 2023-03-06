package db

import (
	"log"
	"openreplay/backend/internal/config/db"
	"openreplay/backend/internal/db/datasaver"
	"openreplay/backend/internal/service"
	"openreplay/backend/pkg/queue/types"
	"time"
)

type dbImpl struct {
	cfg      *db.Config
	consumer types.Consumer
	saver    datasaver.Saver
}

func New(cfg *db.Config, c types.Consumer, s datasaver.Saver) service.Interface {
	service := &dbImpl{
		cfg:      cfg,
		consumer: c,
		saver:    s,
	}
	go service.run()
	return service
}

func (d *dbImpl) commit() {
	d.saver.Commit()
	d.consumer.Commit()
}

func (d *dbImpl) run() {
	commitTick := time.Tick(d.cfg.CommitBatchTimeout)
	for {
		select {
		case <-commitTick:
			d.commit()
		case msg := <-d.consumer.Rebalanced():
			log.Println(msg)
		default:
			if err := d.consumer.ConsumeNext(); err != nil {
				log.Fatalf("Error on consumption: %v", err)
			}
		}
	}
}

func (d *dbImpl) Stop() {
	d.commit()
	if err := d.saver.Close(); err != nil {
		log.Printf("saver.Close error: %s", err)
	}
	d.consumer.Close()
}
