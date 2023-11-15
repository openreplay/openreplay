package ios

import (
	. "openreplay/backend/pkg/messages"
)

type viewComponentDuration struct {
	//
}

func NewViewComponentDurations() *viewComponentDuration {
	compBuilder := &viewComponentDuration{}
	return compBuilder
}

func (b *viewComponentDuration) Handle(message Message, timestamp uint64) Message {
	return nil
}

func (b *viewComponentDuration) Build() Message {
	return nil
}
