package sessionender

import (
	"time"

	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/metrics/ender"
)

// EndedSessionHandler handler for ended sessions
type EndedSessionHandler func(map[uint64]uint64) map[uint64]bool

// session holds information about user's session live status
type session struct {
	lastTimestamp int64 // timestamp from message broker
	lastUpdate    int64 // local timestamp
	lastUserTime  uint64
	isEnded       bool
	isMobile      bool
}

// SessionEnder updates timestamp of last message for each session
type SessionEnder struct {
	metrics  ender.Ender
	timeout  int64
	sessions map[uint64]*session // map[sessionID]session
	timeCtrl *timeController
	parts    uint64
	enabled  bool
}

func New(metrics ender.Ender, timeout int64, parts int) (*SessionEnder, error) {
	return &SessionEnder{
		metrics:  metrics,
		timeout:  timeout,
		sessions: make(map[uint64]*session),
		timeCtrl: NewTimeController(parts),
		parts:    uint64(parts), // ender uses all partitions by default
		enabled:  true,
	}, nil
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
	activeSessions := 0
	for sessID, _ := range se.sessions {
		if !activeParts[sessID%se.parts] {
			delete(se.sessions, sessID)
			se.metrics.DecreaseActiveSessions()
			removedSessions++
		} else {
			activeSessions++
		}
	}
}

// UpdateSession save timestamp for new sessions and update for existing sessions
func (se *SessionEnder) UpdateSession(msg messages.Message) {
	var (
		sessionID      = msg.Meta().SessionID()
		batchTimestamp = msg.Meta().Batch().Timestamp()
		msgTimestamp   = msg.Meta().Timestamp
		localTimestamp = time.Now().UnixMilli()
	)
	if messages.IsMobileType(msg.TypeID()) {
		msgTimestamp = messages.GetTimestamp(msg)
	}
	if batchTimestamp == 0 {
		return
	}
	se.timeCtrl.UpdateTime(sessionID, batchTimestamp, localTimestamp)
	sess, ok := se.sessions[sessionID]
	if !ok {
		// Register new session
		se.sessions[sessionID] = &session{
			lastTimestamp: batchTimestamp,
			lastUpdate:    localTimestamp,
			lastUserTime:  msgTimestamp, // last timestamp from user's machine
			isEnded:       false,
			isMobile:      messages.IsMobileType(msg.TypeID()),
		}
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

// HandleEndedSessions runs handler for each ended session and delete information about session in successful case
func (se *SessionEnder) HandleEndedSessions(handler EndedSessionHandler) {
	if !se.enabled {
		return
	}
	currTime := time.Now().UnixMilli()

	isSessionEnded := func(sessID uint64, sess *session) (bool, int) {
		// Has been finished already
		if sess.isEnded {
			return true, 1
		}
		batchTimeDiff := se.timeCtrl.LastBatchTimestamp(sessID) - sess.lastTimestamp

		// Has been finished according to batch timestamp and hasn't been updated for a long time
		if (batchTimeDiff >= se.timeout) && (currTime-sess.lastUpdate >= se.timeout) {
			return true, 2
		}

		// Hasn't been finished according to batch timestamp but hasn't been read from partition for a long time
		if (batchTimeDiff < se.timeout) && (currTime-se.timeCtrl.LastUpdateTimestamp(sessID) >= se.timeout) {
			return true, 3
		}
		return false, 0
	}

	// Find ended sessions
	endedCandidates := make(map[uint64]uint64, len(se.sessions)/2) // [sessionID]lastUserTime
	for sessID, sess := range se.sessions {
		if ended, _ := isSessionEnded(sessID, sess); ended {
			sess.isEnded = true
			endedCandidates[sessID] = sess.lastUserTime
		}
	}

	// Process ended sessions
	for sessID, completed := range handler(endedCandidates) {
		if completed {
			delete(se.sessions, sessID)
			se.metrics.DecreaseActiveSessions()
			se.metrics.IncreaseClosedSessions()
		}
	}
}
