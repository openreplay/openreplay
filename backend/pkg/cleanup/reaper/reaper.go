package reaper

import (
	"context"
	"fmt"
	"sync"

	"openreplay/backend/pkg/cleanup/registry"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/queue/types"
)

const batchLimit = 1000

type PendingStore interface {
	Due(nowMs int64, limit int64) ([]string, error)
	Remove(members ...string) error
}

type Session struct {
	StartTs  uint64
	Duration *uint64
	FileKey  string
}

type SessionSource interface {
	Load(sessionIDs []uint64) (map[uint64]Session, error)
}

type Config struct {
	TopicTrigger      string
	TopicRawAssets    string
	TopicRawMobile    string
	TopicRawImages    string
	TopicCanvasImages string
	PartitionsNumber  uint64
	ProducerTimeout   int
}

type Reaper struct {
	log      logger.Logger
	store    PendingStore
	sessions SessionSource
	producer types.Producer
	cfg      Config

	mu     sync.RWMutex
	active map[uint64]bool
}

func New(log logger.Logger, store PendingStore, sessions SessionSource, producer types.Producer, cfg Config) *Reaper {
	return &Reaper{
		log:      log,
		store:    store,
		sessions: sessions,
		producer: producer,
		cfg:      cfg,
	}
}

func (r *Reaper) ActivePartitions(parts []uint64) {
	active := make(map[uint64]bool, len(parts))
	for _, p := range parts {
		active[p] = true
	}
	r.mu.Lock()
	r.active = active
	r.mu.Unlock()
}

func (r *Reaper) owns(sessionID uint64) bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return len(r.active) > 0 && r.active[sessionID%r.cfg.PartitionsNumber]
}

func (r *Reaper) Tick(nowMs int64) {
	ctx := context.Background()
	members, err := r.store.Due(nowMs, batchLimit)
	if err != nil {
		r.log.Error(ctx, "reaper: can't read pending sessions: %s", err)
		return
	}
	if len(members) == 0 {
		return
	}

	type entry struct {
		member    string
		sessionID uint64
		isMobile  bool
	}
	entries := make([]entry, 0, len(members))
	ids := make([]uint64, 0, len(members))
	var malformed []string
	for _, m := range members {
		sessionID, isMobile, err := registry.ParseMember(m)
		if err != nil {
			r.log.Warn(ctx, "reaper: %s, removing", err)
			malformed = append(malformed, m)
			continue
		}
		// Skip members owned by other instances (or everything before the first Assign).
		if !r.owns(sessionID) {
			continue
		}
		entries = append(entries, entry{member: m, sessionID: sessionID, isMobile: isMobile})
		ids = append(ids, sessionID)
	}
	if len(malformed) > 0 {
		if err := r.store.Remove(malformed...); err != nil {
			r.log.Warn(ctx, "reaper: can't remove malformed members: %s", err)
		}
	}
	if len(entries) == 0 {
		return
	}

	loaded, err := r.sessions.Load(ids)
	if err != nil {
		r.log.Error(ctx, "reaper: can't load sessions: %s", err)
		return
	}

	toRemove := make([]string, 0, len(entries))
	sent := 0
	for _, e := range entries {
		sessCtx := context.WithValue(ctx, "sessionID", fmt.Sprintf("%d", e.sessionID))
		if sess, ok := loaded[e.sessionID]; ok && sess.Duration != nil {
			if err := r.resend(e.sessionID, e.isMobile, sess); err != nil {
				r.log.Error(sessCtx, "reaper: can't resend sessionEnd, will retry: %s", err)
				continue
			}
			r.log.Info(sessCtx, "reaper: sessionEnd was never delivered, resent")
			toRemove = append(toRemove, e.member)
			sent++
			continue
		}
		if err := r.clean(e.sessionID, e.isMobile); err != nil {
			r.log.Error(sessCtx, "reaper: can't send CleanSession, will retry: %s", err)
			continue // keep the member for the next tick
		}
		r.log.Info(sessCtx, "reaper: session has no sessionEnd, dispatching EFS cleanup")
		toRemove = append(toRemove, e.member)
		sent++
	}
	if sent > 0 {
		r.producer.Flush(r.cfg.ProducerTimeout)
	}
	if len(toRemove) > 0 {
		if err := r.store.Remove(toRemove...); err != nil {
			r.log.Warn(ctx, "reaper: can't remove processed members: %s", err)
		}
	}
}

func (r *Reaper) resend(sessionID uint64, isMobile bool, sess Session) error {
	endTs := sess.StartTs + *sess.Duration
	if isMobile {
		msg := (&messages.MobileSessionEnd{Timestamp: endTs}).Encode()
		if err := r.producer.Produce(r.cfg.TopicRawMobile, sessionID, msg); err != nil {
			return err
		}
		return r.producer.Produce(r.cfg.TopicRawImages, sessionID, msg)
	}
	msg := (&messages.SessionEnd{Timestamp: endTs, EncryptionKey: sess.FileKey}).Encode()
	if err := r.producer.Produce(r.cfg.TopicRawAssets, sessionID, msg); err != nil {
		return err
	}
	return r.producer.Produce(r.cfg.TopicCanvasImages, sessionID, msg)
}

func (r *Reaper) clean(sessionID uint64, isMobile bool) error {
	msg := &messages.CleanSession{}
	imagesTopic := r.cfg.TopicCanvasImages
	if isMobile {
		imagesTopic = r.cfg.TopicRawImages
	}
	if err := r.producer.Produce(imagesTopic, sessionID, msg.Encode()); err != nil {
		return err
	}
	return r.producer.Produce(r.cfg.TopicTrigger, sessionID, msg.Encode())
}
