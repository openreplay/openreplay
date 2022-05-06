package builder

import (
	"net/url"
	"strings"
	"time"

	"openreplay/backend/pkg/intervals"
	. "openreplay/backend/pkg/messages"
)

func getURLExtention(URL string) string {
	u, err := url.Parse(URL)
	if err != nil {
		return ""
	}
	i := strings.LastIndex(u.Path, ".")
	return u.Path[i+1:]
}

func getResourceType(initiator string, URL string) string {
	switch initiator {
	case "xmlhttprequest", "fetch":
		return "fetch"
	case "img":
		return "img"
	default:
		switch getURLExtention(URL) {
		case "css":
			return "stylesheet"
		case "js":
			return "script"
		case "png", "gif", "jpg", "jpeg", "svg":
			return "img"
		case "mp4", "mkv", "ogg", "webm", "avi", "mp3":
			return "media"
		default:
			return "other"
		}
	}
}

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
	integrationsWaiting    bool

	sid uint64
}

func NewBuilder() *builder {
	return &builder{
		ptaBuilder:          &performanceTrackAggrBuilder{},
		ciFinder:            &cpuIssueFinder{},
		miFinder:            &memoryIssueFinder{},
		ddDetector:          &domDropDetector{},
		crDetector:          &clickRageDetector{},
		dcDetector:          &deadClickDetector{},
		integrationsWaiting: true,
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

func (b *builder) buildPerformanceTrackAggr() {
	if msg := b.ptaBuilder.Build(); msg != nil {
		b.appendReadyMessage(msg)
	}
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
		b.buildPerformanceTrackAggr()
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
