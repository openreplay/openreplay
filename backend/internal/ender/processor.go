package ender

import (
	"context"
	"fmt"
	"strings"

	config "openreplay/backend/internal/config/ender"
	"openreplay/backend/pkg/cleanup/registry"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/queue/types"
	"openreplay/backend/pkg/sessions"
	"openreplay/backend/pkg/storage"
)

func ProcessEndedSessions(
	ctx context.Context,
	candidates map[uint64]uint64,
	loaded map[uint64]*sessions.Session,
	sessManager sessions.Sessions,
	producer types.Producer,
	cfg *config.Config,
	log logger.Logger,
	details *LogDetails,
	cleanupReg registry.Registry,
) map[uint64]bool {
	completed := make(map[uint64]bool, len(candidates))
	toUpdate := make(map[uint64]uint64, len(candidates)) // sessionID -> timestamp
	prevDur := make(map[uint64]uint64, len(candidates))  // sessionID -> duration before the update

	for sessionID, timestamp := range candidates {
		sess := loaded[sessionID]
		if sess == nil {
			details.NotFound[sessionID] = timestamp
			completed[sessionID] = true
			continue
		}
		var currDuration uint64
		if sess.Duration != nil {
			currDuration = *sess.Duration
		}
		newDur := timestamp - sess.Timestamp
		if currDuration == newDur {
			if sess.Duration != nil {
				details.Duplicated[sessionID] = currDuration
				log.Info(ctx, "SE_TRACE stage=ender_duplicated site=batch_pre_check sessID=%d dur=%d", sessionID, currDuration)
				completed[sessionID] = true
				continue
			}
			log.Info(ctx, "ending zero-duration session, sessID: %d", sessionID)
		}
		if currDuration > newDur {
			details.Shorter[sessionID] = int64(currDuration) - int64(newDur)
			completed[sessionID] = true
			continue
		}
		toUpdate[sessionID] = timestamp
		prevDur[sessionID] = currDuration
	}

	if len(toUpdate) == 0 {
		return completed
	}

	newDurs, err := sessManager.UpdateDurations(toUpdate, loaded)
	if err != nil {
		log.Error(ctx, "batch duration update failed, falling back per-session: %s", err)
		for sessionID, timestamp := range toUpdate {
			sessCtx := context.WithValue(ctx, "sessionID", fmt.Sprintf("%d", sessionID))
			if ProcessEndedSession(sessCtx, sessionID, timestamp, loaded[sessionID], sessManager, producer, cfg, log, details, cleanupReg) {
				completed[sessionID] = true
			}
		}
		return completed
	}

	for sessionID, timestamp := range toUpdate {
		newDuration, ok := newDurs[sessionID]
		if !ok {
			// No RETURNING row: the session isn't in the table.
			details.NotFound[sessionID] = timestamp
			completed[sessionID] = true
			continue
		}
		sessCtx := context.WithValue(ctx, "sessionID", fmt.Sprintf("%d", sessionID))
		if emitSessionEnd(sessCtx, sessionID, timestamp, loaded[sessionID], prevDur[sessionID], newDuration, sessManager, producer, cfg, log, details, cleanupReg) {
			completed[sessionID] = true
		}
	}
	return completed
}

func ProcessEndedSession(
	ctx context.Context,
	sessionID uint64,
	timestamp uint64,
	sess *sessions.Session,
	sessManager sessions.Sessions,
	producer types.Producer,
	cfg *config.Config,
	log logger.Logger,
	details *LogDetails,
	cleanupReg registry.Registry,
) bool {
	if sess == nil {
		details.NotFound[sessionID] = timestamp
		return true
	}

	var currDuration uint64
	if sess.Duration != nil {
		currDuration = *sess.Duration
	}
	newDur := timestamp - sess.Timestamp
	if currDuration == newDur {
		if sess.Duration != nil {
			details.Duplicated[sessionID] = currDuration
			log.Info(ctx, "SE_TRACE stage=ender_duplicated site=fallback_pre_check sessID=%d dur=%d", sessionID, currDuration)
			return true
		}
		log.Info(ctx, "ending zero-duration session, sessID: %d", sessionID)
	}
	if currDuration > newDur {
		details.Shorter[sessionID] = int64(currDuration) - int64(newDur)
		return true
	}

	newDuration, err := sessManager.UpdateDuration(sessionID, timestamp)
	if err != nil {
		switch {
		case strings.Contains(err.Error(), "integer out of range"):
			details.Failed[sessionID] = timestamp
			return true
		case strings.Contains(err.Error(), "is less than zero for uint64"):
			details.Negative[sessionID] = timestamp
			return true
		case strings.Contains(err.Error(), "no rows in result set"):
			details.NotFound[sessionID] = timestamp
			return true
		}
		log.Error(ctx, "can't update session duration, err: %s", err)
		return false
	}
	return emitSessionEnd(ctx, sessionID, timestamp, sess, currDuration, newDuration, sessManager, producer, cfg, log, details, cleanupReg)
}

func emitSessionEnd(
	ctx context.Context,
	sessionID uint64,
	timestamp uint64,
	sess *sessions.Session,
	currDuration uint64,
	newDuration uint64,
	sessManager sessions.Sessions,
	producer types.Producer,
	cfg *config.Config,
	log logger.Logger,
	details *LogDetails,
	cleanupReg registry.Registry,
) bool {
	// Re-check after the update — could have raced with another path.
	if currDuration == newDuration && currDuration != 0 {
		details.Duplicated[sessionID] = currDuration
		log.Info(ctx, "SE_TRACE stage=ender_duplicated site=post_update_check sessID=%d dur=%d", sessionID, currDuration)
		return true
	}

	msg := &messages.SessionEnd{Timestamp: timestamp}
	if cfg.UseEncryption {
		if key := storage.GenerateEncryptionKey(); key != nil {
			if err := sessManager.UpdateEncryptionKey(sessionID, key); err != nil {
				log.Warn(ctx, "can't save session encryption key: %s, session will not be encrypted", err)
			} else {
				msg.EncryptionKey = string(key)
			}
		}
	}

	if sess.Platform == "ios" || sess.Platform == "android" {
		mobileMsg := &messages.MobileSessionEnd{Timestamp: timestamp}
		if err := producer.Produce(cfg.TopicRawMobile, sessionID, mobileMsg.Encode()); err != nil {
			log.Error(ctx, "can't send MobileSessionEnd to mobile topic: %s", err)
			return false
		}
		if err := producer.Produce(cfg.TopicRawImages, sessionID, mobileMsg.Encode()); err != nil {
			log.Error(ctx, "can't send MobileSessionEnd signal to canvas topic: %s", err)
		}
	} else {
		if err := producer.Produce(cfg.TopicRawAssets, sessionID, msg.Encode()); err != nil {
			log.Error(ctx, "can't send sessionEnd to raw topic: %s", err)
			return false
		}
		if err := producer.Produce(cfg.TopicCanvasImages, sessionID, msg.Encode()); err != nil {
			log.Error(ctx, "can't send sessionEnd signal to canvas topic: %s", err)
		}
	}

	cleanupReg.Done(sessionID)

	log.Info(ctx, "SE_TRACE stage=ender_emitted sessID=%d prevDur=%d newDur=%d platform=%s", sessionID, currDuration, newDuration, sess.Platform)

	if currDuration != 0 {
		details.Diff[sessionID] = int64(newDuration) - int64(currDuration)
		details.Updated++
	} else {
		details.New++
	}
	return true
}
