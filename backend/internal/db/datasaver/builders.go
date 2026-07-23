package datasaver

import (
	"context"
	"time"

	"openreplay/backend/pkg/handlers"
	"openreplay/backend/pkg/handlers/custom"
	"openreplay/backend/pkg/handlers/mobile"
	"openreplay/backend/pkg/handlers/web"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/messages"
)

const (
	builderTTL         = 30 * time.Minute
	builderSweepPeriod = 10 * time.Second
)

func heuristicsProcessors() []handlers.MessageProcessor {
	return []handlers.MessageProcessor{
		custom.NewPageEventBuilder(),
		&web.NetworkIssueDetector{},
		&web.PerformanceAggregator{},
		web.NewAppCrashDetector(),
		&mobile.TapRageDetector{},
	}
}

func HeuristicsInputTypes() []int {
	types := []int{messages.MsgSessionEnd, messages.MsgMobileSessionEnd}
	for _, p := range heuristicsProcessors() {
		types = append(types, p.MessageTypes()...)
	}
	return types
}

type builder struct {
	processors []handlers.MessageProcessor
	dispatch   map[int][]handlers.MessageProcessor
	timestamp  uint64
	lastSeen   time.Time
}

func newBuilder() *builder {
	procs := heuristicsProcessors()
	dispatch := make(map[int][]handlers.MessageProcessor)
	for _, p := range procs {
		for _, t := range p.MessageTypes() {
			dispatch[t] = append(dispatch[t], p)
		}
	}
	return &builder{processors: procs, dispatch: dispatch}
}

type builders struct {
	log       logger.Logger
	inputs    *messages.TypeFilter
	sessions  map[uint64]*builder
	emit      func(messages.Message)
	lastSweep time.Time
}

func newBuilders(log logger.Logger, emit func(messages.Message)) *builders {
	return &builders{
		log:       log,
		inputs:    messages.NewTypeFilter(HeuristicsInputTypes()),
		sessions:  make(map[uint64]*builder),
		emit:      emit,
		lastSweep: time.Now(),
	}
}

func (bs *builders) Handle(msg messages.Message) {
	now := time.Now()
	if now.Sub(bs.lastSweep) > builderSweepPeriod {
		bs.lastSweep = now
		bs.sweep(now)
	}
	if !bs.inputs.Has(msg.TypeID()) {
		return
	}
	sessionID := msg.SessionID()
	b := bs.sessions[sessionID]
	if b == nil {
		b = newBuilder()
		bs.sessions[sessionID] = b
	}
	if msg.Time() <= 0 {
		bs.log.Debug(context.Background(), "skip heuristics message with incorrect timestamp, session: %d, msgID: %d, msgType: %d",
			sessionID, msg.MsgID(), msg.TypeID())
		return
	}
	if msg.Time() > b.timestamp {
		b.timestamp = msg.Time()
	}
	b.lastSeen = now

	for _, p := range b.dispatch[msg.TypeID()] {
		if rm := p.Handle(msg, b.timestamp); rm != nil {
			rm.Meta().SetMeta(msg.Meta())
			bs.emit(rm)
		}
	}

	switch msg.TypeID() {
	case messages.MsgSessionEnd, messages.MsgMobileSessionEnd:
		bs.flush(sessionID, b)
		delete(bs.sessions, sessionID)
	}
}

func (bs *builders) flush(sessionID uint64, b *builder) {
	for _, p := range b.processors {
		if rm := p.Build(); rm != nil {
			rm.Meta().SetSessionID(sessionID)
			bs.emit(rm)
		}
	}
}

func (bs *builders) sweep(now time.Time) {
	for sessionID, b := range bs.sessions {
		if now.Sub(b.lastSeen) > builderTTL {
			bs.flush(sessionID, b)
			delete(bs.sessions, sessionID)
		}
	}
}
