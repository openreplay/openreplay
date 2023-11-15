package connector

import (
	"log"
	"openreplay/backend/internal/config/connector"
	"time"

	"openreplay/backend/internal/service"
	saver "openreplay/backend/pkg/connector"
	"openreplay/backend/pkg/memory"
	"openreplay/backend/pkg/queue/types"
)

type dbImpl struct {
	cfg      *connector.Config
	consumer types.Consumer
	saver    *saver.Saver
	mm       memory.Manager
}

func New(cfg *connector.Config, consumer types.Consumer, saver *saver.Saver, mm memory.Manager) service.Interface {
	s := &dbImpl{
		cfg:      cfg,
		consumer: consumer,
		saver:    saver,
		mm:       mm,
	}
	go s.run()
	return s
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
			if !d.mm.HasFreeMemory() {
				continue
			}
			if err := d.consumer.ConsumeNext(); err != nil {
				log.Fatalf("Error on consumption: %v", err)
			}
		}
	}
}

func (d *dbImpl) commit() {
	d.saver.Commit()
	d.consumer.Commit()
}

func (d *dbImpl) Stop() {
	d.commit()
	if err := d.saver.Close(); err != nil {
		log.Printf("saver.Close error: %s", err)
	}
	d.consumer.Close()
}
