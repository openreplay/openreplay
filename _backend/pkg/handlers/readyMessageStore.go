package handlers

import (
	. "openreplay/backend/pkg/messages"
)

type ReadyMessageStore struct {
	store []Message
}

func (s *ReadyMessageStore) Append(msg Message) {
	s.store = append(s.store, msg)
}

func (s *ReadyMessageStore) IterateReadyMessages(cb func(msg Message)) {
	for _, msg := range s.store {
		cb(msg)
	}
	s.store = nil
}
