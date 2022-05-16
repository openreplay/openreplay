package sessionender

import (
	"log"
	"time"
)

// EndedSessionHandler handler for ended sessions
type EndedSessionHandler func(sessionID uint64, timestamp int64) bool

// session holds information about user's session live status
type session struct {
	lastTimestamp int64
	isEnded       bool
}

// SessionEnder updates timestamp of last message for each session
type SessionEnder struct {
	timeout  int64
	sessions map[uint64]*session // map[sessionID]session
}

func New(timeout int64) *SessionEnder {
	return &SessionEnder{
		timeout:  timeout,
		sessions: make(map[uint64]*session),
	}
}

// UpdateSession save timestamp for new sessions and update for existing sessions
func (se *SessionEnder) UpdateSession(sessionID, timestamp uint64) {
	currTS := int64(timestamp)
	if currTS == 0 {
		log.Printf("got empty timestamp for sessionID: %d", sessionID)
		return
	}
	sess, ok := se.sessions[sessionID]
	if !ok {
		se.sessions[sessionID] = &session{
			lastTimestamp: currTS,
			isEnded:       false,
		}
		return
	}
	if currTS > sess.lastTimestamp {
		sess.lastTimestamp = currTS
		sess.isEnded = false
	}
}

// HandleEndedSessions runs handler for each ended session and delete information about session in successful case
func (se *SessionEnder) HandleEndedSessions(handler EndedSessionHandler) {
	deadLine := time.Now().UnixMilli() - se.timeout
	for sessID, sess := range se.sessions {
		if sess.isEnded || sess.lastTimestamp < deadLine {
			sess.isEnded = true
			if handler(sessID, sess.lastTimestamp) {
				delete(se.sessions, sessID)
			}
		}
	}
}
