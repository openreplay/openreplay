package builder

import (
	. "openreplay/backend/pkg/messages"
)


const CLICK_RELATION_TIME = 1400

type deadClickDetector struct {
	lastMouseClick  *MouseClick
	lastTimestamp uint64
	lastMessageID   uint64
	inputIDSet map[uint64]bool
}


func (d *deadClickDetector) HandleReaction(timestamp uint64) *IssueEvent {
	var i *IssueEvent
	if d.lastMouseClick != nil && d.lastTimestamp + CLICK_RELATION_TIME < timestamp {
		i = &IssueEvent{
			Type: "dead_click",
			ContextString: d.lastMouseClick.Label,
			Timestamp: d.lastTimestamp,
			MessageID: d.lastMessageID,
		}
	}
	d.inputIDSet = nil
	d.lastMouseClick = nil
	d.lastTimestamp = 0
	d.lastMessageID = 0
	return i
}

func (d *deadClickDetector) HandleMessage(msg Message, messageID uint64, timestamp uint64) *IssueEvent {
	var i *IssueEvent
	switch m := msg.(type) {
	case *SetInputTarget:
		if d.inputIDSet == nil {
			d.inputIDSet = make(map[uint64]bool)
		}
		d.inputIDSet[m.ID] = true
	case *CreateDocument:
		d.inputIDSet = nil
	case *MouseClick:
		i = d.HandleReaction(timestamp)
		if d.inputIDSet[m.ID] { // ignore if input
			return i
		}
		d.lastMouseClick = m
		d.lastTimestamp = timestamp
		d.lastMessageID = messageID
	case *SetNodeAttribute, 
		*RemoveNodeAttribute, 
		*CreateElementNode,
		*CreateTextNode,
		*MoveNode,
		*RemoveNode,
		*SetCSSData,
		*CSSInsertRule,
		*CSSDeleteRule:
		i = d.HandleReaction(timestamp)
	}
	return i
}


