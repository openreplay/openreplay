package ender

import (
	"context"
	"strings"

	config "openreplay/backend/internal/config/ender"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/queue/types"
	"openreplay/backend/pkg/sessions"
	"openreplay/backend/pkg/storage"
)

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
		details.Duplicated[sessionID] = currDuration
		return true
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
	// Re-check after the update — could have raced with another path.
	if currDuration == newDuration {
		details.Duplicated[sessionID] = currDuration
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

	if currDuration != 0 {
		details.Diff[sessionID] = int64(newDuration) - int64(currDuration)
		details.Updated++
	} else {
		details.New++
	}
	return true
}
