package sessionender

import (
	"log"
	"time"

	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/metrics/ender"
)

// EndedSessionHandler handler for ended sessions
type EndedSessionHandler func(sessionID uint64, timestamp uint64) (bool, int)

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
	timeout  int64
	sessions map[uint64]*session // map[sessionID]session
	timeCtrl *timeController
	parts    uint64
	enabled  bool
}

func New(timeout int64, parts int) (*SessionEnder, error) {
	return &SessionEnder{
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
			ender.DecreaseActiveSessions()
			removedSessions++
		} else {
			activeSessions++
		}
	}
	log.Printf("SessionEnder: %d sessions left in active partitions: %+v, removed %d sessions",
		activeSessions, parts, removedSessions)
}

// UpdateSession save timestamp for new sessions and update for existing sessions
func (se *SessionEnder) UpdateSession(msg messages.Message) {
	var (
		sessionID      = msg.Meta().SessionID()
		batchTimestamp = msg.Meta().Batch().Timestamp()
		msgTimestamp   = msg.Meta().Timestamp
		localTimestamp = time.Now().UnixMilli()
	)
	if messages.IsIOSType(msg.TypeID()) {
		msgTimestamp = messages.GetTimestamp(msg)
		log.Printf("got timestamp from iOS message, session: %d, ts: %d", msg.SessionID(), msgTimestamp)
	}
	if batchTimestamp == 0 {
		log.Printf("got empty timestamp for sessionID: %d", sessionID)
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
			isMobile:      messages.IsIOSType(msg.TypeID()),
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
	if !se.enabled {
		log.Printf("SessionEnder is disabled")
		return
	}
	currTime := time.Now().UnixMilli()
	allSessions, removedSessions := len(se.sessions), 0
	brokerTime := make(map[int]int, 0)
	serverTime := make(map[int]int, 0)

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

	for sessID, sess := range se.sessions {
		if ended, endCase := isSessionEnded(sessID, sess); ended {
			sess.isEnded = true
			if res, _ := handler(sessID, sess.lastUserTime); res {
				delete(se.sessions, sessID)
				ender.DecreaseActiveSessions()
				ender.IncreaseClosedSessions()
				removedSessions++
				if endCase == 2 {
					brokerTime[1]++
				}
				if endCase == 3 {
					serverTime[1]++
				}
			} else {
				log.Printf("sessID: %d, userTime: %d", sessID, sess.lastUserTime)
			}
		}
	}
	log.Printf("Removed %d of %d sessions; brokerTime: %d, serverTime: %d",
		removedSessions, allSessions, brokerTime, serverTime)
}
