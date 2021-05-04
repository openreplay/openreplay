package builder

import (
	. "openreplay/backend/pkg/messages"
)

type builderMap map[uint64]*builder


func NewBuilderMap() builderMap {
	return make(builderMap)
}

func (m builderMap) GetBuilder(sessionID uint64) *builder {
	b := m[sessionID]
	if b == nil {
		b = NewBuilder()
		m[sessionID] = b
		b.sid = sessionID

	}
	return b
}

func (m builderMap) HandleMessage(sessionID uint64, msg Message, messageID uint64) {
	b := m.GetBuilder(sessionID)
	b.handleMessage(msg, messageID)
}

func (m builderMap) IterateSessionReadyMessages(sessionID uint64, operatingTs int64, iter func(msg Message)) {
	b, ok := m[ sessionID ]
	if !ok { return }
	sessionEnded := b.checkTimeouts(operatingTs)
	b.iterateReadyMessage(iter)
	if sessionEnded {
		delete(m, sessionID)
	}
}

func (m builderMap) IterateReadyMessages(operatingTs int64, iter func(sessionID uint64, msg Message)) {
	for sessionID, b := range m {
		sessionEnded := b.checkTimeouts(operatingTs)
		b.iterateReadyMessage(func(msg Message) {
			iter(sessionID, msg)
		})
		if sessionEnded {
			delete(m, sessionID)
		}
	}
}


