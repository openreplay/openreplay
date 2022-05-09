package web

import (
	. "openreplay/backend/pkg/messages"
)

// TODO: Description of dead click detector

const CLICK_RELATION_TIME = 1400

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

func (d *DeadClickDetector) handleReaction(timestamp uint64) Message {
	if d.lastMouseClick == nil || d.lastClickTimestamp+CLICK_RELATION_TIME > timestamp { // riaction is instant
		d.reset()
		return nil
	}
	i := &IssueEvent{
		Type:          "dead_click",
		ContextString: d.lastMouseClick.Label,
		Timestamp:     d.lastClickTimestamp,
		MessageID:     d.lastMessageID,
	}
	d.reset()
	return i
}

func (d *DeadClickDetector) Build() Message {
	return d.handleReaction(d.lastTimestamp)
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
		i := d.handleReaction(timestamp)
		if d.inputIDSet[msg.ID] { // ignore if input
			return i
		}
		d.lastMouseClick = msg
		d.lastClickTimestamp = timestamp
		d.lastMessageID = messageID
		return i
	case *SetNodeAttribute,
		*RemoveNodeAttribute,
		*CreateElementNode,
		*CreateTextNode,
		*MoveNode,
		*RemoveNode,
		*SetCSSData,
		*CSSInsertRule,
		*CSSDeleteRule:
		return d.handleReaction(timestamp)
	}
	return nil
}
