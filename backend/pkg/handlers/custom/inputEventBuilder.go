package custom

import (
	. "openreplay/backend/pkg/messages"
)

const InputEventTimeout = 1 * 60 * 1000

type inputLabels map[uint64]string

type inputEventBuilder struct {
	inputEvent  *InputEvent
	inputLabels inputLabels
	inputID     uint64
}

func NewInputEventBuilder() *inputEventBuilder {
	ieBuilder := &inputEventBuilder{}
	ieBuilder.clearLabels()
	return ieBuilder
}

func (b *inputEventBuilder) clearLabels() {
	b.inputLabels = make(inputLabels)
}

func (b *inputEventBuilder) Handle(message Message, timestamp uint64) Message {
	var inputEvent Message = nil
	switch msg := message.(type) {
	case *SetInputTarget:
		if b.inputID != msg.ID {
			inputEvent = b.Build()
			b.inputID = msg.ID
		}
		b.inputLabels[msg.ID] = msg.Label
		return inputEvent
	case *SetInputValue:
		if b.inputID != msg.ID {
			inputEvent = b.Build()
			b.inputID = msg.ID
		}
		if b.inputEvent == nil {
			b.inputEvent = &InputEvent{
				MessageID:   message.MsgID(),
				Timestamp:   timestamp,
				Value:       msg.Value,
				ValueMasked: msg.Mask > 0,
			}
		} else {
			b.inputEvent.Value = msg.Value
			b.inputEvent.ValueMasked = msg.Mask > 0
		}
		return inputEvent
	case *CreateDocument:
		inputEvent = b.Build()
		b.clearLabels()
		return inputEvent
	case *MouseClick:
		return b.Build()
	}

	if b.inputEvent != nil && b.inputEvent.Timestamp+InputEventTimeout < timestamp {
		return b.Build()
	}
	return nil
}

func (b *inputEventBuilder) Build() Message {
	if b.inputEvent == nil {
		return nil
	}
	inputEvent := b.inputEvent
	inputEvent.Label = b.inputLabels[b.inputID] // might be empty string

	b.inputEvent = nil
	return inputEvent
}
