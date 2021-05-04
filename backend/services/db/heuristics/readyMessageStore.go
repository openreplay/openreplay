package heuristics

import (
  . "openreplay/backend/pkg/messages"
)


type readyMessageStore struct {
	store []Message
}

func (s *readyMessageStore) append(msg Message) {
	s.store = append(s.store, msg)
}

func (s *readyMessageStore) IterateReadyMessages(cb func(msg Message)) {
	for _, msg := range s.store {
		cb(msg)
	}
	s.store = nil
}