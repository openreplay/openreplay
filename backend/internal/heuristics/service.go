package heuristics

import (
	"log"
	"time"

	"openreplay/backend/internal/config/heuristics"
	"openreplay/backend/internal/service"
	"openreplay/backend/pkg/queue/types"
	"openreplay/backend/pkg/sessions"
)

type heuristicsImpl struct {
	cfg      *heuristics.Config
	producer types.Producer
	consumer types.Consumer
	events   sessions.EventBuilder
}

func New(cfg *heuristics.Config, p types.Producer, c types.Consumer, e sessions.EventBuilder) service.Interface {
	s := &heuristicsImpl{
		cfg:      cfg,
		producer: p,
		consumer: c,
		events:   e,
	}
	go s.run()
	return s
}

func (h *heuristicsImpl) run() {
	tick := time.Tick(15 * time.Second)
	for {
		select {
		case evt := <-h.events.Events():
			log.Printf("topic: %s", h.cfg.TopicAnalytics)
			if err := h.producer.Produce(h.cfg.TopicAnalytics, evt.SessionID(), evt.Encode()); err != nil {
				log.Printf("can't send new event to queue: %s", err)
			} else {
				log.Printf("new event has been sent to db, type: %d, sess: %d", evt.TypeID(), evt.SessionID())
			}
		case <-tick:
			h.producer.Flush(h.cfg.ProducerTimeout)
			h.consumer.Commit()
			h.events.ClearOldSessions()
		case msg := <-h.consumer.Rebalanced():
			log.Println(msg)
		default:
			if err := h.consumer.ConsumeNext(); err != nil {
				log.Fatalf("Error on consuming: %v", err)
			}
		}
	}
}

func (h *heuristicsImpl) Stop() {
	h.producer.Close(h.cfg.ProducerTimeout)
	h.consumer.Commit()
	h.consumer.Close()
}
