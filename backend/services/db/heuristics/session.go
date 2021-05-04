package heuristics

import (
  . "openreplay/backend/pkg/messages"
  . "openreplay/backend/pkg/db/types"
)


type sessHandler struct {
	session *Session
	handlers []Handler
	ended bool
}


func newSessHandler(session *Session) *sessHandler {
	return &sessHandler{
		session: session,
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