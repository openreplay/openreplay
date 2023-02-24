package heuristics

import (
	"log"
	"time"

	"openreplay/backend/internal/config/heuristics"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/queue/types"
	"openreplay/backend/pkg/sessions"
)

type Heuristics interface {
	Stop()
}

type heuristicsImpl struct {
	cfg      *heuristics.Config
	producer types.Producer
	consumer types.Consumer
	events   sessions.EventBuilder
}

func New(cfg *heuristics.Config, p types.Producer, c types.Consumer, e sessions.EventBuilder) Heuristics {
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
	tick := time.Tick(10 * time.Second)
	for {
		select {
		case <-tick:
			h.events.IterateReadyMessages(func(sessionID uint64, readyMsg messages.Message) {
				h.producer.Produce(h.cfg.TopicAnalytics, sessionID, readyMsg.Encode())
			})
			h.producer.Flush(h.cfg.ProducerTimeout)
			h.consumer.Commit()
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
