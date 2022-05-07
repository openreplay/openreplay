package heuristics

import (
	. "openreplay/backend/pkg/messages"
)

type Handler interface {
	HandleMessage(Message)
	IterateReadyMessages(func(Message))
}

type sessHandler struct {
	handlers []Handler
	ended    bool
}

func newSessHandler() *sessHandler {
	return &sessHandler{
		handlers: []Handler{
			new(clickrage),
			new(performanceAggregator),
			new(anr),
		},
	}
}

func (s *sessHandler) HandleMessage(msg Message) {
	for _, h := range s.handlers {
		h.HandleMessage(msg)
	}
	if _, isEnd := msg.(*IOSSessionEnd); isEnd {
		s.ended = true
	}
	if _, isEnd := msg.(*SessionEnd); isEnd {
		s.ended = true
	}
}

func (s *sessHandler) IterateReadyMessages(cb func(msg Message)) {
	for _, h := range s.handlers {
		h.IterateReadyMessages(cb)
	}
}

func (s *sessHandler) IsEnded() bool {
	return s.ended
}
