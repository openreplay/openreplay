package builder

import (
	. "openreplay/backend/pkg/messages"
)

type inputLabels map[uint64]string

type inputEventBuilder struct {
	inputEvent         *InputEvent
	inputLabels        inputLabels
	inputID            uint64
}

func NewInputEventBuilder() *inputEventBuilder {
	ieBuilder := &inputEventBuilder{}
	ieBuilder.ClearLabels()
	return ieBuilder
}


func (b *inputEventBuilder) ClearLabels() {
	b.inputLabels = make(inputLabels)
}

func (b *inputEventBuilder) HandleSetInputTarget(msg *SetInputTarget) *InputEvent {
	var inputEvent *InputEvent
	if b.inputID != msg.ID {
		inputEvent = b.Build()
		b.inputID = msg.ID
	}
	b.inputLabels[msg.ID] = msg.Label
	return inputEvent
}

func (b *inputEventBuilder) HandleSetInputValue(msg *SetInputValue, messageID uint64, timestamp uint64) *InputEvent {
	var inputEvent *InputEvent
	if b.inputID != msg.ID {
		inputEvent = b.Build()
		b.inputID = msg.ID
	}
	if b.inputEvent == nil {
		b.inputEvent = &InputEvent{
			MessageID:   messageID,
			Timestamp:   timestamp,
			Value:       msg.Value,
			ValueMasked: msg.Mask > 0,
		}
	} else {
		b.inputEvent.Value = msg.Value
		b.inputEvent.ValueMasked = msg.Mask > 0
	}
	return inputEvent
}

func (b *inputEventBuilder) HasInstance() bool {
	return b.inputEvent != nil
}

func (b * inputEventBuilder) GetTimestamp() uint64 {
	if b.inputEvent == nil {
		return 0
	}
	return b.inputEvent.Timestamp;
}

func (b *inputEventBuilder) Build() *InputEvent {
	if b.inputEvent == nil {
		return nil
	}
	inputEvent := b.inputEvent
	label, exists := b.inputLabels[b.inputID]
	if !exists {
		return nil
	}
	inputEvent.Label = label

	b.inputEvent = nil
	return inputEvent
}
