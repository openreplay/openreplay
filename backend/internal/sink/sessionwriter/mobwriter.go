package sessionwriter

import (
	"context"
	"fmt"
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
	startTime   time.Time
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
	done          chan struct{}
	stopped       chan struct{}
}

func NewMobWriter(log logger.Logger, filePool *FilePool, workingDir string, fileSplitTime time.Duration, maxFileSize int64) *MobWriter {
	w := &MobWriter{
		log:           log,
		workingDir:    workingDir + "/",
		fileSplitTime: fileSplitTime,
		maxFileSize:   maxFileSize,
		pool:          filePool,
		done:          make(chan struct{}),
		stopped:       make(chan struct{}),
	}
	go w.synchronizer()
	return w
}

func (w *MobWriter) getOrCreateSession(sid uint64) *mobSession {
	if sessObj, ok := w.sessions.Load(sid); ok {
		return sessObj.(*mobSession)
	}
	base := w.workingDir + strconv.FormatUint(sid, 10)
	sess := &mobSession{
		paths:     [3]string{base + "s", base + "e", base + "devtools"},
		startTime: time.Now(),
	}
	actual, _ := w.sessions.LoadOrStore(sid, sess)
	return actual.(*mobSession)
}

func (w *MobWriter) HandleBatch(data []byte, info *messages.BatchInfo) {
	ctx := context.WithValue(context.Background(), "sessionID", info.SessionID())
	version := info.Version()

	// Only handle player (2), assets (3), devtools (4); ignore old batches (1) and analytics (5+)
	if version < uint64(messages.PlayerBatch) || version > uint64(messages.DevtoolsBatch) {
		return
	}

	sess := w.getOrCreateSession(info.SessionID())

	switch messages.BatchType(version) {
	case messages.PlayerBatch, messages.AssetsBatch:
		if time.Since(sess.startTime) <= w.fileSplitTime {
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
	w.done <- struct{}{}
	<-w.stopped
}

func (w *MobWriter) Info() string {
	return fmt.Sprintf("open FDs: %d/%d", w.pool.OpenCount(), w.pool.limit)
}

func (w *MobWriter) synchronizer() {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			w.pool.Sync()
		case <-w.done:
			// Close all remaining sessions
			w.sessions.Range(func(key, value any) bool {
				sess := value.(*mobSession)
				for _, p := range sess.paths {
					w.pool.CloseFile(p)
				}
				w.sessions.Delete(key)
				return true
			})
			w.pool.Stop()
			w.stopped <- struct{}{}
			return
		}
	}
}
