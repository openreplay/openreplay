package sessionender

import (
	"context"
	"fmt"
	"go.opentelemetry.io/otel/metric/instrument/syncfloat64"
	"log"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/monitoring"
	"time"
)

// EndedSessionHandler handler for ended sessions
type EndedSessionHandler func(sessionID uint64, timestamp int64) bool

// session holds information about user's session live status
type session struct {
	lastTimestamp int64
	lastUpdate    int64
	lastUserTime  int64
	isEnded       bool
}

// SessionEnder updates timestamp of last message for each session
type SessionEnder struct {
	timeout        int64
	sessions       map[uint64]*session // map[sessionID]session
	timeCtrl       *timeController
	activeSessions syncfloat64.UpDownCounter
	totalSessions  syncfloat64.Counter
}

func New(metrics *monitoring.Metrics, timeout int64, parts int) (*SessionEnder, error) {
	if metrics == nil {
		return nil, fmt.Errorf("metrics module is empty")
	}
	activeSessions, err := metrics.RegisterUpDownCounter("sessions_active")
	if err != nil {
		return nil, fmt.Errorf("can't register session.active metric: %s", err)
	}
	totalSessions, err := metrics.RegisterCounter("sessions_total")
	if err != nil {
		return nil, fmt.Errorf("can't register session.total metric: %s", err)
	}

	return &SessionEnder{
		timeout:        timeout,
		sessions:       make(map[uint64]*session),
		timeCtrl:       NewTimeController(parts),
		activeSessions: activeSessions,
		totalSessions:  totalSessions,
	}, nil
}

// UpdateSession save timestamp for new sessions and update for existing sessions
func (se *SessionEnder) UpdateSession(msg messages.Message) {
	sessionID := msg.Meta().SessionID()
	currTS := msg.Meta().Batch().Timestamp()
	msgTimestamp := msg.Meta().Timestamp
	localTS := time.Now().UnixMilli()
	if currTS == 0 {
		log.Printf("got empty timestamp for sessionID: %d", sessionID)
		return
	}
	se.timeCtrl.UpdateTime(sessionID, currTS)
	sess, ok := se.sessions[sessionID]
	if !ok {
		se.sessions[sessionID] = &session{
			lastTimestamp: currTS,       // timestamp from message broker
			lastUpdate:    localTS,      // local timestamp
			lastUserTime:  msgTimestamp, // last timestamp from user's machine
			isEnded:       false,
		}
		se.activeSessions.Add(context.Background(), 1)
		se.totalSessions.Add(context.Background(), 1)
		return
	}
	// Keep the highest user's timestamp for correct session duration value
	if msgTimestamp > sess.lastUserTime {
		sess.lastUserTime = msgTimestamp
	}
	// Keep information about the latest message for generating sessionEnd trigger
	if currTS > sess.lastTimestamp {
		sess.lastTimestamp = currTS
		sess.lastUpdate = localTS
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
				se.activeSessions.Add(context.Background(), -1)
				removedSessions++
			} else {
				log.Printf("sessID: %d, userTime: %d", sessID, sess.lastUserTime)
			}
		}
	}
	log.Printf("Removed %d of %d sessions", removedSessions, allSessions)
}
