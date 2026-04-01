package sessionwriter

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strconv"
	"sync"
	"time"

	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/sessions"
)

const (
	idxDomS     = 0
	idxDomE     = 1
	idxDevtools = 2
)

var headerV1 = []byte{0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff}
var headerV2 = []byte{0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xfe}

type mobSession struct {
	startTime int64
	header    []byte
	paths     [3]string // [domS, domE, devtools]
	stopped   [3]bool   // per-file write stopped due to size limit
}

type MobWriter struct {
	log           logger.Logger
	workingDir    string
	fileSplitTime time.Duration
	pool          *FilePool
	sessions      sync.Map
	sessManager   sessions.Sessions
}

func NewMobWriter(log logger.Logger, sessions sessions.Sessions, filePool *FilePool, workingDir string, fileSplitTime time.Duration) *MobWriter {
	return &MobWriter{
		log:           log,
		workingDir:    workingDir + "/",
		fileSplitTime: fileSplitTime,
		pool:          filePool,
		sessManager:   sessions,
	}
}

func (w *MobWriter) getOrCreateSession(batch *messages.BatchInfo) *mobSession {
	if sessObj, ok := w.sessions.Load(batch.SessionID()); ok {
		return sessObj.(*mobSession)
	}
	base := w.workingDir + strconv.FormatUint(batch.SessionID(), 10)

	var paths [3]string
	if _, err := os.Stat(base); err == nil {
		paths = [3]string{base, base, base + "devtools"}
	} else {
		paths = [3]string{base + "s", base + "e", base + "devtools"}
	}
	sess := &mobSession{
		paths:     paths,
		startTime: time.Now().UnixMilli(),
	}
	if batch.Type() == messages.FullBatch {
		sess.header = headerV1
	} else {
		sess.header = headerV2
	}

	sessInfo, err := w.sessManager.Get(batch.SessionID())
	if err != nil {
		w.log.Error(context.Background(), "can't get sessionInfo: %s", err)
	} else {
		sess.startTime = int64(sessInfo.Timestamp)
	}

	actual, _ := w.sessions.LoadOrStore(batch.SessionID(), sess)
	return actual.(*mobSession)
}

// HandleBatch can correctly process both old rewritten batch format and the new one
func (w *MobWriter) HandleBatch(data []byte, batch *messages.BatchInfo) {
	ctx := context.WithValue(context.Background(), "sessionID", batch.SessionID())
	sess := w.getOrCreateSession(batch)

	switch batch.Type() {
	case messages.FullBatch, messages.PlayerBatch, messages.AssetsBatch:
		if batch.DataTimestamp()-sess.startTime <= w.fileSplitTime.Milliseconds() {
			if err := w.pool.Write(sess.paths[idxDomS], sess.header, data); err != nil {
				w.log.Error(ctx, "domS write error: %s", err)
			}
		} else {
			if sess.stopped[idxDomE] {
				return
			}
			if err := w.pool.Write(sess.paths[idxDomE], nil, data); err != nil {
				if errors.Is(err, ErrSizeLimitExceeded) {
					sess.stopped[idxDomE] = true
					w.log.Warn(ctx, "domE exceeded max file size for session %d", batch.SessionID())
					return
				}
				w.log.Error(ctx, "domE write error: %s", err)
			}
		}
	case messages.DevtoolsBatch:
		if err := w.pool.Write(sess.paths[idxDevtools], sess.header, data); err != nil {
			w.log.Error(ctx, "devtools write error: %s", err)
		}
	default:
		// TODO: change to Debug level
		w.log.Warn(ctx, "unknown batch type: %s", messages.BatchType(batch.Version()))
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
