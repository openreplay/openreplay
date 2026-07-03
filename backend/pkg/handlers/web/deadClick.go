package web

import (
	. "openreplay/backend/pkg/messages"
)

const ClickRelationTime = 1234

type DeadClickDetector struct {
	lastMouseClick     *MouseClick
	lastTimestamp      uint64
	lastClickTimestamp uint64
	lastMessageID      uint64
	inputIDSet         map[uint64]bool
}

func NewDeadClickDetector() *DeadClickDetector {
	return &DeadClickDetector{inputIDSet: make(map[uint64]bool)}
}

func (d *DeadClickDetector) MessageTypes() []int {
	return []int{
		MsgMouseClick,
		MsgSetInputTarget,
		MsgCreateDocument,
		MsgCreateElementNode,
		MsgCreateTextNode,
		MsgMoveNode,
		MsgRemoveNode,
		MsgSetNodeAttribute,
		MsgRemoveNodeAttribute,
		MsgSetCSSData,
		MsgSetNodeFocus,
		MsgSetInputValue,
		MsgSetInputChecked,
	}
}

func (d *DeadClickDetector) addInputID(id uint64) {
	d.inputIDSet[id] = true
}

func (d *DeadClickDetector) clearInputIDs() {
	clear(d.inputIDSet)
}

func (d *DeadClickDetector) reset() {
	d.lastMouseClick = nil
	d.lastClickTimestamp = 0
	d.lastMessageID = 0
	d.clearInputIDs()
}

func (d *DeadClickDetector) Build() Message {
	// remove reset from external Build call
	defer d.reset()
	if d.lastMouseClick == nil || d.lastClickTimestamp+ClickRelationTime > d.lastTimestamp { // reaction is instant
		return nil
	}
	event := &IssueEvent{
		Type:          "dead_click",
		ContextString: d.lastMouseClick.Label,
		Timestamp:     d.lastClickTimestamp,
		MessageID:     d.lastMessageID,
		Context:       d.lastMouseClick.Selector, // hack to pass selector to db (tags filter)
	}
	return event
}

func (d *DeadClickDetector) Handle(message Message, timestamp uint64) Message {
	d.lastTimestamp = timestamp
	switch message.TypeID() {
	case MsgMouseClick:
		msg, ok := message.Decode().(*MouseClick)
		if !ok {
			return nil
		}
		if msg.Label == "" {
			return nil
		}
		isInputEvent := d.inputIDSet[msg.ID]
		event := d.Build()
		if isInputEvent {
			return event
		}
		d.lastMouseClick = msg
		d.lastClickTimestamp = timestamp
		d.lastMessageID = message.MsgID()
		return event
	case MsgSetInputTarget:
		msg, ok := message.Decode().(*SetInputTarget)
		if !ok {
			return nil
		}
		d.addInputID(msg.ID)
	case MsgCreateDocument:
		d.clearInputIDs()
	case MsgSetNodeAttribute, MsgRemoveNodeAttribute, MsgCreateElementNode,
		MsgCreateTextNode, MsgSetNodeFocus, MsgMoveNode, MsgRemoveNode,
		MsgSetCSSData, MsgSetInputValue, MsgSetInputChecked:
		return d.Build()
	}
	return nil
}
