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

type DurationSource interface {
	Durations(sessionIDs []uint64) (map[uint64]*uint64, error)
}

type Config struct {
	TopicTrigger      string
	TopicRawImages    string
	TopicCanvasImages string
	PartitionsNumber  uint64
	ProducerTimeout   int
}

type Reaper struct {
	log      logger.Logger
	store    PendingStore
	sessions DurationSource
	producer types.Producer
	cfg      Config

	mu     sync.RWMutex
	active map[uint64]bool
}

func New(log logger.Logger, store PendingStore, sessions DurationSource, producer types.Producer, cfg Config) *Reaper {
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

	durations, err := r.sessions.Durations(ids)
	if err != nil {
		r.log.Error(ctx, "reaper: can't load session durations: %s", err)
		return
	}

	toRemove := make([]string, 0, len(entries))
	cleaned := 0
	for _, e := range entries {
		if dur, ok := durations[e.sessionID]; ok && dur != nil {
			toRemove = append(toRemove, e.member)
			continue
		}
		sessCtx := context.WithValue(ctx, "sessionID", fmt.Sprintf("%d", e.sessionID))
		if err := r.clean(e.sessionID, e.isMobile); err != nil {
			r.log.Error(sessCtx, "reaper: can't send CleanSession, will retry: %s", err)
			continue // keep the member for the next tick
		}
		r.log.Info(sessCtx, "reaper: session has no sessionEnd, dispatching EFS cleanup")
		toRemove = append(toRemove, e.member)
		cleaned++
	}
	if cleaned > 0 {
		r.producer.Flush(r.cfg.ProducerTimeout)
	}
	if len(toRemove) > 0 {
		if err := r.store.Remove(toRemove...); err != nil {
			r.log.Warn(ctx, "reaper: can't remove processed members: %s", err)
		}
	}
}

func (r *Reaper) clean(sessionID uint64, isMobile bool) error {
	msg := &messages.CleanSession{}
	if isMobile {
		return r.producer.Produce(r.cfg.TopicRawImages, sessionID, msg.Encode())
	}
	if err := r.producer.Produce(r.cfg.TopicCanvasImages, sessionID, msg.Encode()); err != nil {
		return err
	}
	return r.producer.Produce(r.cfg.TopicTrigger, sessionID, msg.Encode())
}
