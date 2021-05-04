package heuristics

import (
  . "openreplay/backend/pkg/messages"
  . "openreplay/backend/pkg/db/types"
)

type MessageHandler interface {
	HandleMessage(Message)
}
type ReadyMessagesIterator interface {
	IterateReadyMessages(func(Message))
}

type Handler interface {
	MessageHandler
	ReadyMessagesIterator
}

type mainHandler map[uint64]*sessHandler


func NewHandler() mainHandler {
	return make(mainHandler)
}

func (m mainHandler) getSessHandler(session *Session) *sessHandler {
	if session == nil {
		//AAAA
		return nil
	}
	s := m[session.SessionID]
	if s == nil {
		s = newSessHandler(session)
		m[session.SessionID] = s
	}
	return s
}

func (m mainHandler) HandleMessage(session *Session, msg Message) {
	s := m.getSessHandler(session)
	s.HandleMessage(msg)
}

func (m mainHandler) IterateSessionReadyMessages(sessionID uint64, iter func(msg Message)) {
	s, ok := m[ sessionID ]
	if !ok { return }
	s.IterateReadyMessages(iter)
	if s.IsEnded() {
		delete(m, sessionID)
	}
}

func (m mainHandler) IterateReadyMessages(iter func(sessionID uint64, msg Message)) {
	for sessionID, s := range m {
		s.IterateReadyMessages(func(msg Message) {
			iter(sessionID, msg)
		})
		if s.IsEnded() {
			delete(m, sessionID)
		}
	}
}


