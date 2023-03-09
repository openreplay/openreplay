package sessionender

import (
	"log"
	"time"

	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/metrics/ender"
)

// EndedSessionHandler handler for ended sessions
type EndedSessionHandler func(sessionID uint64, timestamp uint64) bool

// session holds information about user's session live status
type session struct {
	lastTimestamp int64
	lastUpdate    int64
	lastUserTime  uint64
	isEnded       bool
}

// SessionEnder updates timestamp of last message for each session
type SessionEnder struct {
	timeout  int64
	sessions map[uint64]*session // map[sessionID]session
	timeCtrl *timeController
}

func New(timeout int64, parts int) (*SessionEnder, error) {
	return &SessionEnder{
		timeout:  timeout,
		sessions: make(map[uint64]*session),
		timeCtrl: NewTimeController(parts),
	}, nil
}

// UpdateSession save timestamp for new sessions and update for existing sessions
func (se *SessionEnder) UpdateSession(msg messages.Message) {
	var (
		sessionID      = msg.Meta().SessionID()
		batchTimestamp = msg.Meta().Batch().Timestamp()
		msgTimestamp   = msg.Meta().Timestamp
		localTimestamp = time.Now().UnixMilli()
	)
	if batchTimestamp == 0 {
		log.Printf("got empty timestamp for sessionID: %d", sessionID)
		return
	}
	se.timeCtrl.UpdateTime(sessionID, batchTimestamp)
	sess, ok := se.sessions[sessionID]
	if !ok {
		// Register new session
		se.sessions[sessionID] = &session{
			lastTimestamp: batchTimestamp, // timestamp from message broker
			lastUpdate:    localTimestamp, // local timestamp
			lastUserTime:  msgTimestamp,   // last timestamp from user's machine
			isEnded:       false,
		}
		ender.IncreaseActiveSessions()
		ender.IncreaseTotalSessions()
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
	currTime := time.Now().UnixMilli()
	allSessions, removedSessions := len(se.sessions), 0
	for sessID, sess := range se.sessions {
		if sess.isEnded || (se.timeCtrl.LastTimestamp(sessID)-sess.lastTimestamp > se.timeout) ||
			(currTime-sess.lastUpdate > se.timeout) {
			sess.isEnded = true
			if handler(sessID, sess.lastUserTime) {
				delete(se.sessions, sessID)
				ender.DecreaseActiveSessions()
				ender.IncreaseClosedSessions()
				removedSessions++
			} else {
				log.Printf("sessID: %d, userTime: %d", sessID, sess.lastUserTime)
			}
		}
	}
	log.Printf("Removed %d of %d sessions", removedSessions, allSessions)
}
