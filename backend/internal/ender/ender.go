package ender

import (
	"context"
	"fmt"
	"time"

	"openreplay/backend/pkg/db/redis"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/metrics/ender"
)

type EndedSessionHandler func(map[uint64]uint64) map[uint64]bool

const (
	pageHasPlayer  uint8 = 1 << 0
	pageHasAssets  uint8 = 1 << 1
	pageComplete         = pageHasPlayer | pageHasAssets
	validKeyTTL          = 4 * time.Hour
	redisOpTimeout       = 500 * time.Millisecond
)

// session holds information about user's session live status
type session struct {
	lastTimestamp int64 // timestamp from message broker
	lastUpdate    int64 // local timestamp
	lastUserTime  uint64
	isEnded       bool
	isMobile      bool
	isValid       bool // true once we saw a legacy batch or a page with both Player+Assets OR for mobile
	redisChecked  bool
	seenPages     map[uint64]uint8
}

func (s *session) Validate() {
	s.isValid = true
	s.seenPages = nil
}

// SessionEnder updates timestamp of last message for each session
type SessionEnder struct {
	log      logger.Logger
	redis    *redis.Client
	metrics  ender.Ender
	timeout  int64
	sessions map[uint64]*session // map[sessionID]session
	timeCtrl *timeController
	parts    uint64
	enabled  bool
}

func New(log logger.Logger, redisClient *redis.Client, metrics ender.Ender, timeout int64, parts int) (*SessionEnder, error) {
	return &SessionEnder{
		log:      log,
		redis:    redisClient,
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
			isMobile:      isMobile,
		}
		se.sessions[sessionID] = sess
		se.metrics.IncreaseActiveSessions()
		se.metrics.IncreaseTotalSessions()
		se.updateSessionValidity(sess, sessionID, batch)
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
	se.updateSessionValidity(sess, sessionID, batch)
}

func (se *SessionEnder) updateSessionValidity(sess *session, sessID uint64, batch *messages.BatchInfo) {
	if sess.isValid {
		return
	}
	if sess.isMobile {
		sess.Validate()
		return
	}
	if batch.Type() == messages.FullBatch {
		sess.Validate()
		return
	}
	if batch.Type() != messages.PlayerBatch && batch.Type() != messages.AssetsBatch {
		return
	}

	if !sess.redisChecked {
		sess.redisChecked = true
		if se.hasValidKey(sessID) {
			sess.Validate()
			return
		}
	}

	page := batch.PageNo()
	if sess.seenPages == nil {
		sess.seenPages = make(map[uint64]uint8)
	}
	if batch.Type() == messages.PlayerBatch {
		sess.seenPages[page] |= pageHasPlayer
	} else {
		sess.seenPages[page] |= pageHasAssets
	}
	if sess.seenPages[page] == pageComplete {
		sess.Validate()
		se.writeValidKey(sessID)
	}
}

func (se *SessionEnder) hasValidKey(sessID uint64) bool {
	if se.redis == nil || se.redis.Redis == nil {
		return false
	}
	ctx, cancel := context.WithTimeout(context.Background(), redisOpTimeout)
	defer cancel()
	res, err := se.redis.Redis.Exists(ctx, validKey(sessID)).Result()
	if err != nil {
		sessCtx := context.WithValue(context.Background(), "sessionID", fmt.Sprintf("%d", sessID))
		se.log.Warn(sessCtx, "redis EXISTS ender:valid failed: %s", err)
		return false
	}
	return res > 0
}

func (se *SessionEnder) writeValidKey(sessID uint64) {
	if se.redis == nil || se.redis.Redis == nil {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), redisOpTimeout)
	defer cancel()
	if err := se.redis.Redis.Set(ctx, validKey(sessID), 1, validKeyTTL).Err(); err != nil {
		sessCtx := context.WithValue(context.Background(), "sessionID", fmt.Sprintf("%d", sessID))
		se.log.Warn(sessCtx, "redis SET ender:valid failed: %s", err)
	}
}

func validKey(sessID uint64) string {
	return fmt.Sprintf("ender:valid:%d", sessID)
}

func (se *SessionEnder) HandleEndedSessions(handler EndedSessionHandler) {
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
	for sessID, sess := range se.sessions {
		if !isSessionEnded(sessID, sess) {
			continue
		}
		sess.isEnded = true
		if !sess.isValid {
			sessCtx := context.WithValue(context.Background(), "sessionID", fmt.Sprintf("%d", sessID))
			se.log.Info(sessCtx, "skip sessionEnd: session has no Player+Assets pair, pages seen: %v", sess.seenPages)
			delete(se.sessions, sessID)
			se.metrics.DecreaseActiveSessions()
			continue
		}
		endedCandidates[sessID] = sess.lastUserTime
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
