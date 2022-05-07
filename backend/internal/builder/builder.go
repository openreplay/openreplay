package builder

import (
	"net/url"
	"strings"
	"time"

	"openreplay/backend/pkg/intervals"
	. "openreplay/backend/pkg/messages"
)

type builder struct {
	readyMsgs              []Message
	timestamp              uint64
	lastProcessedTimestamp int64
	ptaBuilder             *performanceTrackAggrBuilder
	ciFinder               *cpuIssueFinder
	miFinder               *memoryIssueFinder
	ddDetector             *domDropDetector
	crDetector             *clickRageDetector
	dcDetector             *deadClickDetector
}

func NewBuilder() *builder {
	return &builder{
		ptaBuilder: &performanceTrackAggrBuilder{},
		ciFinder:   &cpuIssueFinder{},
		miFinder:   &memoryIssueFinder{},
		ddDetector: &domDropDetector{},
		crDetector: &clickRageDetector{},
		dcDetector: &deadClickDetector{},
	}
}

func (b *builder) appendReadyMessage(msg Message) { // interface is never nil even if it holds nil value
	b.readyMsgs = append(b.readyMsgs, msg)
}

func (b *builder) iterateReadyMessage(iter func(msg Message)) {
	for _, readyMsg := range b.readyMsgs {
		iter(readyMsg)
	}
	b.readyMsgs = nil
}

func (b *builder) handleMessage(message Message, messageID uint64) {
	timestamp := GetTimestamp(message)
	if b.timestamp < timestamp {
		b.timestamp = timestamp
	}

	b.lastProcessedTimestamp = time.Now().UnixMilli()

	if b.timestamp == 0 {
		return
	}
	switch msg := message.(type) {
	case *PerformanceTrack:
		if rm := b.ptaBuilder.HandlePerformanceTrack(msg, b.timestamp); rm != nil {
			b.appendReadyMessage(rm)
		}
		if rm := b.ciFinder.HandlePerformanceTrack(msg, messageID, b.timestamp); rm != nil {
			b.appendReadyMessage(rm)
		}
		if rm := b.miFinder.HandlePerformanceTrack(msg, messageID, b.timestamp); rm != nil {
			b.appendReadyMessage(rm)
		}
	case *CreateElementNode,
		*CreateTextNode:
		b.ddDetector.HandleNodeCreation()
	case *RemoveNode:
		b.ddDetector.HandleNodeRemoval(b.timestamp)
	case *CreateDocument:
		if rm := b.ddDetector.Build(); rm != nil {
			b.appendReadyMessage(rm)
		}
	}
	if rm := b.dcDetector.HandleMessage(message, messageID, b.timestamp); rm != nil {
		b.appendReadyMessage(rm)
	}
}

func (b *builder) checkTimeouts(ts int64) bool {
	if b.timestamp == 0 {
		return false // There was no timestamp events yet
	}

	if b.ptaBuilder.HasInstance() && int64(b.ptaBuilder.GetStartTimestamp())+intervals.EVENTS_PERFORMANCE_AGGREGATION_TIMEOUT < ts {
		if msg := b.ptaBuilder.Build(); msg != nil {
			b.appendReadyMessage(msg)
		}
	}

	lastTsGap := ts - int64(b.timestamp)
	if lastTsGap > intervals.EVENTS_SESSION_END_TIMEOUT {
		if rm := b.ddDetector.Build(); rm != nil {
			b.appendReadyMessage(rm)
		}
		if rm := b.ciFinder.Build(); rm != nil {
			b.appendReadyMessage(rm)
		}
		if rm := b.miFinder.Build(); rm != nil {
			b.appendReadyMessage(rm)
		}
		if rm := b.crDetector.Build(); rm != nil {
			b.appendReadyMessage(rm)
		}
		if rm := b.dcDetector.HandleReaction(b.timestamp); rm != nil {
			b.appendReadyMessage(rm)
		}
		return true
	}
	return false
}
