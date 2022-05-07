package heuristics

import (
	. "openreplay/backend/pkg/messages"
)

type mainHandler map[uint64]*sessHandler

func NewHandler() mainHandler {
	return make(mainHandler)
}

func (m mainHandler) getSessHandler(sessionID uint64) *sessHandler {
	s := m[sessionID]
	if s == nil {
		s = newSessHandler()
		m[sessionID] = s
	}
	return s
}

func (m mainHandler) HandleMessage(sessionID uint64, msg Message) {
	s := m.getSessHandler(sessionID)
	s.HandleMessage(msg)
}

func (m mainHandler) IterateSessionReadyMessages(sessionID uint64, iter func(msg Message)) {
	s, ok := m[sessionID]
	if !ok {
		return
	}
	s.IterateReadyMessages(iter)
	if s.IsEnded() {
		delete(m, sessionID)
	}
}
