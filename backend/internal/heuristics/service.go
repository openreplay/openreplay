package heuristics

import (
	"fmt"
	"log"
	"openreplay/backend/pkg/memory"
	"openreplay/backend/pkg/messages"
	metrics "openreplay/backend/pkg/metrics/heuristics"
	"time"

	"openreplay/backend/internal/config/heuristics"
	"openreplay/backend/internal/service"
	"openreplay/backend/pkg/builders"
	"openreplay/backend/pkg/queue/types"
)

type heuristicsImpl struct {
	cfg      *heuristics.Config
	producer types.Producer
	consumer types.Consumer
	events   builders.EventBuilder
	mm       memory.Manager
	done     chan struct{}
	finished chan struct{}
}

func New(cfg *heuristics.Config, p types.Producer, c types.Consumer, e builders.EventBuilder, mm memory.Manager) service.Interface {
	s := &heuristicsImpl{
		cfg:      cfg,
		producer: p,
		consumer: c,
		events:   e,
		mm:       mm,
		done:     make(chan struct{}),
		finished: make(chan struct{}),
	}
	go s.run()
	return s
}

func (h *heuristicsImpl) run() {
	tick := time.Tick(10 * time.Second)
	for {
		select {
		case evt := <-h.events.Events():
			if err := h.producer.Produce(h.cfg.TopicAnalytics, evt.SessionID(), evt.Encode()); err != nil {
				log.Printf("can't send new event to queue: %s", err)
			} else {
				metrics.IncreaseTotalEvents(messageTypeName(evt))
			}
		case <-tick:
			h.producer.Flush(h.cfg.ProducerTimeout)
			h.consumer.Commit()
		case msg := <-h.consumer.Rebalanced():
			log.Println(msg)
		case <-h.done:
			// Stop event builder and flush all events
			log.Println("stopping heuristics service")
			h.events.Stop()
			for evt := range h.events.Events() {
				if err := h.producer.Produce(h.cfg.TopicAnalytics, evt.SessionID(), evt.Encode()); err != nil {
					log.Printf("can't send new event to queue: %s", err)
				}
			}
			h.producer.Close(h.cfg.ProducerTimeout)
			h.consumer.Commit()
			h.consumer.Close()
			h.finished <- struct{}{}
		default:
			if !h.mm.HasFreeMemory() {
				continue
			}
			if err := h.consumer.ConsumeNext(); err != nil {
				log.Fatalf("Error on consuming: %v", err)
			}
		}
	}
}

func (h *heuristicsImpl) Stop() {
	h.done <- struct{}{}
	<-h.finished
}

func messageTypeName(msg messages.Message) string {
	switch msg.TypeID() {
	case 31:
		return "PageEvent"
	case 32:
		return "InputEvent"
	case 56:
		return "PerformanceTrackAggr"
	case 69:
		return "MouseClick"
	case 125:
		m := msg.(*messages.IssueEvent)
		return fmt.Sprintf("IssueEvent(%s)", m.Type)
	default:
		return "unknown"
	}
}
