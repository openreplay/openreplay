package web

import (
	. "openreplay/backend/pkg/messages"
)

/*
	Handler name: DeadClick
	Input events: SetInputTarget,
				  CreateDocument,
				  MouseClick,
				  SetNodeAttribute,
				  RemoveNodeAttribute,
				  CreateElementNode,
				  CreateTextNode,
				  MoveNode,
				  RemoveNode,
				  SetCSSData,
				  CSSInsertRule,
				  CSSDeleteRule
	Output event: IssueEvent
*/

const CLICK_RELATION_TIME = 1234

type DeadClickDetector struct {
	lastTimestamp      uint64
	lastMouseClick     *MouseClick
	lastClickTimestamp uint64
	lastMessageID      uint64
	inputIDSet         map[uint64]bool
}

func (d *DeadClickDetector) reset() {
	d.inputIDSet = nil
	d.lastMouseClick = nil
	d.lastClickTimestamp = 0
	d.lastMessageID = 0
}

func (d *DeadClickDetector) build(timestamp uint64) Message {
	defer d.reset()
	if d.lastMouseClick == nil || d.lastClickTimestamp+CLICK_RELATION_TIME > timestamp { // reaction is instant
		return nil
	}
	event := &IssueEvent{
		Type:          "dead_click",
		ContextString: d.lastMouseClick.Label,
		Timestamp:     d.lastClickTimestamp,
		MessageID:     d.lastMessageID,
	}
	return event
}

func (d *DeadClickDetector) Build() Message {
	return d.build(d.lastTimestamp)
}

func (d *DeadClickDetector) Handle(message Message, messageID uint64, timestamp uint64) Message {
	d.lastTimestamp = timestamp
	switch msg := message.(type) {
	case *SetInputTarget:
		if d.inputIDSet == nil {
			d.inputIDSet = make(map[uint64]bool)
		}
		d.inputIDSet[msg.ID] = true
	case *CreateDocument:
		d.inputIDSet = nil
	case *MouseClick:
		if msg.Label == "" {
			return nil
		}
		event := d.build(timestamp)
		if d.inputIDSet[msg.ID] { // ignore if input
			return event
		}
		d.lastMouseClick = msg
		d.lastClickTimestamp = timestamp
		d.lastMessageID = messageID
		return event
	case *SetNodeAttribute,
		*RemoveNodeAttribute,
		*CreateElementNode,
		*CreateTextNode,
		*MoveNode,
		*RemoveNode,
		*SetCSSData,
		*CSSInsertRule,
		*CSSDeleteRule:
		return d.build(timestamp)
	}
	return nil
}
