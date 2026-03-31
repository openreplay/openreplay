package sessionwriter

import (
	"context"
	"fmt"
	"openreplay/backend/pkg/sessions"
	"strconv"
	"sync"
	"time"

	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/messages"
)

const (
	idxDomS     = 0
	idxDomE     = 1
	idxDevtools = 2
)

type mobSession struct {
	paths       [3]string // [domS, domE, devtools]
	startTime   int64
	domESize    int64
	domEStopped bool
}

type MobWriter struct {
	log           logger.Logger
	workingDir    string
	fileSplitTime time.Duration
	maxFileSize   int64
	pool          *FilePool
	sessions      sync.Map
	sessManager   sessions.Sessions
}

func NewMobWriter(log logger.Logger, sessions sessions.Sessions, filePool *FilePool, workingDir string, fileSplitTime time.Duration, maxFileSize int64) *MobWriter {
	return &MobWriter{
		log:           log,
		workingDir:    workingDir + "/",
		fileSplitTime: fileSplitTime,
		maxFileSize:   maxFileSize,
		pool:          filePool,
		sessManager:   sessions,
	}
}

func (w *MobWriter) getOrCreateSession(sid uint64) *mobSession {
	if sessObj, ok := w.sessions.Load(sid); ok {
		return sessObj.(*mobSession)
	}
	base := w.workingDir + strconv.FormatUint(sid, 10)
	sessInfo, err := w.sessManager.Get(sid)
	if err != nil {
		w.log.Error(context.Background(), "can't get sessionInfo: %s", err)
	}
	sess := &mobSession{
		paths:     [3]string{base + "s", base + "e", base + "devtools"},
		startTime: time.Now().UnixMilli(),
	}
	if sessInfo != nil {
		sess.startTime = int64(sessInfo.Timestamp)
	}
	actual, _ := w.sessions.LoadOrStore(sid, sess)
	return actual.(*mobSession)
}

func (w *MobWriter) HandleBatch(data []byte, info *messages.BatchInfo) {
	ctx := context.WithValue(context.Background(), "sessionID", info.SessionID())
	sess := w.getOrCreateSession(info.SessionID())

	switch messages.BatchType(info.Version()) {
	case messages.FullBatch, messages.PlayerBatch, messages.AssetsBatch:
		if info.Timestamp()-sess.startTime <= w.fileSplitTime.Milliseconds() {
			if err := w.pool.Write(sess.paths[idxDomS], data); err != nil {
				w.log.Error(ctx, "domS write error: %s", err)
			}
		} else {
			if sess.domEStopped {
				return
			}
			if sess.domESize >= w.maxFileSize {
				sess.domEStopped = true
				w.log.Warn(ctx, "domE exceeded max file size for session %d", info.SessionID())
				return
			}
			if err := w.pool.Write(sess.paths[idxDomE], data); err != nil {
				w.log.Error(ctx, "domE write error: %s", err)
				return
			}
			sess.domESize += int64(len(data))
		}
	case messages.DevtoolsBatch:
		if err := w.pool.Write(sess.paths[idxDevtools], data); err != nil {
			w.log.Error(ctx, "devtools write error: %s", err)
		}
	default:
		// TODO: change to Debug level
		w.log.Warn(ctx, "unknown batch type: %s", messages.BatchType(info.Version()))
	}
}

func (w *MobWriter) Close(sid uint64) {
	sessObj, ok := w.sessions.LoadAndDelete(sid)
	if !ok {
		return
	}
	sess := sessObj.(*mobSession)
	for _, p := range sess.paths {
		w.pool.CloseFile(p)
	}
}

func (w *MobWriter) Sync() {
	w.pool.Sync()
}

func (w *MobWriter) Stop() {
	w.sessions.Range(func(key, value any) bool {
		sess := value.(*mobSession)
		for _, p := range sess.paths {
			w.pool.CloseFile(p)
		}
		w.sessions.Delete(key)
		return true
	})
}

func (w *MobWriter) Info() string {
	return fmt.Sprintf("open FDs: %d/%d", w.pool.OpenCount(), w.pool.limit)
}
