package custom

import . "openreplay/backend/pkg/messages"

type CustomHandler struct {
	lastTimestamp uint64
}

func (h *CustomHandler) Handle(message Message, messageID uint64, timestamp uint64) Message {
	h.lastTimestamp = timestamp
	return nil
}

func (h *CustomHandler) Build() Message {
	return nil
}
