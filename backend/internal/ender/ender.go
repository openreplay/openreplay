package ender

import (
	"context"
	"fmt"
	"sync"
	"sync/atomic"
	"time"

	"openreplay/backend/pkg/cleanup/registry"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/metrics/ender"
)

type EndedSessionHandler func(candidates map[uint64]uint64, retry map[uint64]bool) map[uint64]bool

// session holds information about user's session live status
type session struct {
	lastTimestamp int64 // timestamp from message broker
	lastUpdate    int64 // local timestamp
	lastUserTime  uint64
	isEnded       bool
	emitPending   bool // sessionEnd was not delivered
}

type delivery struct {
	sessionID uint64
	timestamp uint64
	err       error
}

// SessionEnder updates timestamp of last message for each session
type SessionEnder struct {
	log        logger.Logger
	metrics    ender.Ender
	cleanupReg registry.Registry
	timeout    int64
	sessions   map[uint64]*session // map[sessionID]session
	timeCtrl   *timeController
	parts      uint64
	enabled    bool

	inFlight atomic.Int64
	ackMu    sync.Mutex
	acks     []delivery
}

func New(log logger.Logger, metrics ender.Ender, cleanupReg registry.Registry, timeout int64, parts int) (*SessionEnder, error) {
	return &SessionEnder{
		log:        log,
		metrics:    metrics,
		cleanupReg: cleanupReg,
		timeout:    timeout,
		sessions:   make(map[uint64]*session),
		timeCtrl:   NewTimeController(parts),
		parts:      uint64(parts), // ender uses all partitions by default
		enabled:    true,
	}, nil
}

func (se *SessionEnder) Track(sessionID, timestamp uint64) func(error) {
	se.inFlight.Add(1)
	return func(err error) {
		se.ackMu.Lock()
		se.acks = append(se.acks, delivery{sessionID: sessionID, timestamp: timestamp, err: err})
		se.ackMu.Unlock()
	}
}

func (se *SessionEnder) ApplyDeliveries() {
	se.ackMu.Lock()
	acks := se.acks
	se.acks = nil
	se.ackMu.Unlock()
	for _, d := range acks {
		se.inFlight.Add(-1)
		if d.err == nil {
			se.cleanupReg.Done(d.sessionID)
			continue
		}
		se.metrics.IncreaseEndErrors(ender.StageDeliver, 1)
		sessCtx := context.WithValue(context.Background(), "sessionID", fmt.Sprintf("%d", d.sessionID))
		se.log.Error(sessCtx, "sessionEnd was not delivered, will retry: %s", d.err)
		sess, ok := se.sessions[d.sessionID]
		if !ok {
			sess = &session{lastUserTime: d.timestamp, isEnded: true}
			se.sessions[d.sessionID] = sess
			se.metrics.IncreaseActiveSessions()
		}
		sess.emitPending = true
	}
}

func (se *SessionEnder) Pending() int {
	n := int(se.inFlight.Load())
	for _, sess := range se.sessions {
		if sess.emitPending {
			n++
		}
	}
	return n
}

func (se *SessionEnder) Enable() {
	se.enabled = true
}

func (se *SessionEnder) Disable() {
	se.enabled = false
}

func (se *SessionEnder) ActivePartitions(parts []uint64) {
	activeParts := make(map[uint64]bool, 0)
	for _, p := range parts {
		activeParts[p] = true
	}
	removedSessions := 0
	for sessID := range se.sessions {
		if !activeParts[sessID%se.parts] {
			delete(se.sessions, sessID)
			se.metrics.DecreaseActiveSessions()
			removedSessions++
		}
	}
	se.metrics.IncreaseRebalanceEvictions(float64(removedSessions))
}

// UpdateSession save timestamp for new sessions and update for existing sessions
func (se *SessionEnder) UpdateSession(msg messages.Message) {
	var (
		sessionID      = msg.Meta().SessionID()
		batch          = msg.Meta().Batch()
		batchTimestamp = batch.Timestamp()
		msgTimestamp   = msg.Meta().Timestamp
		localTimestamp = time.Now().UnixMilli()
		isMobile       = messages.IsMobileType(msg.TypeID())
	)
	if isMobile {
		msgTimestamp = messages.GetTimestamp(msg)
	}
	if batchTimestamp == 0 {
		return
	}
	se.timeCtrl.UpdateTime(sessionID, batchTimestamp, localTimestamp)
	sess, ok := se.sessions[sessionID]
	if !ok {
		// Register new session
		sess = &session{
			lastTimestamp: batchTimestamp,
			lastUpdate:    localTimestamp,
			lastUserTime:  msgTimestamp, // last timestamp from user's machine
			isEnded:       false,
		}
		se.sessions[sessionID] = sess
		se.metrics.IncreaseActiveSessions()
		se.metrics.IncreaseTotalSessions()
		return
	}
	// Keep the highest user's timestamp for correct session duration value
	if msgTimestamp > sess.lastUserTime {
		sess.lastUserTime = msgTimestamp
	}
	// Keep information about the latest message for generating sessionEnd trigger
	if batchTimestamp > sess.lastTimestamp {
		sess.lastTimestamp = batchTimestamp
		sess.lastUpdate = localTimestamp
		sess.isEnded = false
	}
}

func (se *SessionEnder) HandleEndedSessions(handler EndedSessionHandler) {
	se.ApplyDeliveries()
	if !se.enabled {
		return
	}
	currTime := time.Now().UnixMilli()

	isSessionEnded := func(sessID uint64, sess *session) bool {
		if sess.isEnded {
			return true
		}
		batchTimeDiff := se.timeCtrl.LastBatchTimestamp(sessID) - sess.lastTimestamp
		// Finished according to batch timestamp and hasn't been updated for a long time.
		if (batchTimeDiff >= se.timeout) && (currTime-sess.lastUpdate >= se.timeout) {
			return true
		}
		// Not finished by batch timestamp but the partition hasn't been read for a long time.
		if (batchTimeDiff < se.timeout) && (currTime-se.timeCtrl.LastUpdateTimestamp(sessID) >= se.timeout) {
			return true
		}
		return false
	}

	// Find ended sessions
	endedCandidates := make(map[uint64]uint64, len(se.sessions)/2) // [sessionID]lastUserTime
	retry := make(map[uint64]bool)
	for sessID, sess := range se.sessions {
		if !isSessionEnded(sessID, sess) {
			continue
		}
		sess.isEnded = true
		endedCandidates[sessID] = sess.lastUserTime
		if sess.emitPending {
			retry[sessID] = true
		}
	}

	// Process ended sessions
	completed := handler(endedCandidates, retry)
	for sessID := range endedCandidates {
		if !completed[sessID] {
			se.sessions[sessID].emitPending = true
			continue
		}
		delete(se.sessions, sessID)
		se.metrics.DecreaseActiveSessions()
	}
}
