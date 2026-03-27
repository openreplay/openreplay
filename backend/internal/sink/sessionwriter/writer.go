package sessionwriter

import (
	"fmt"
	"strconv"
	"sync"

	"openreplay/backend/pkg/logger"
)

type sessionPaths struct {
	dom string
	dev string
}

type SessionWriter struct {
	log        logger.Logger
	workingDir string
	pool       *FilePool
	sessions   sync.Map
}

func NewWriter(log logger.Logger, filePool *FilePool, workingDir string) *SessionWriter {
	return &SessionWriter{
		log:        log,
		workingDir: workingDir + "/",
		pool:       filePool,
	}
}

func (w *SessionWriter) Write(sid uint64, domBuffer, devBuffer []byte) error {
	paths := w.getOrCreatePaths(sid)

	if len(domBuffer) > 0 {
		if err := w.pool.Write(paths.dom, domBuffer); err != nil {
			return fmt.Errorf("dom write error for session %d: %w", sid, err)
		}
	}
	if len(devBuffer) > 0 {
		if err := w.pool.Write(paths.dev, devBuffer); err != nil {
			return fmt.Errorf("dev write error for session %d: %w", sid, err)
		}
	}
	return nil
}

func (w *SessionWriter) getOrCreatePaths(sid uint64) *sessionPaths {
	if obj, ok := w.sessions.Load(sid); ok {
		return obj.(*sessionPaths)
	}
	base := w.workingDir + strconv.FormatUint(sid, 10)
	paths := &sessionPaths{
		dom: base,
		dev: base + "devtools",
	}
	actual, _ := w.sessions.LoadOrStore(sid, paths)
	return actual.(*sessionPaths)
}

func (w *SessionWriter) Close(sid uint64) error {
	obj, ok := w.sessions.LoadAndDelete(sid)
	if !ok {
		return fmt.Errorf("session: %d not found", sid)
	}
	paths := obj.(*sessionPaths)
	w.pool.CloseFile(paths.dom)
	w.pool.CloseFile(paths.dev)
	return nil
}

func (w *SessionWriter) Sync() {
	w.pool.Sync()
}

func (w *SessionWriter) Stop() {
	w.sessions.Range(func(key, value any) bool {
		paths := value.(*sessionPaths)
		w.pool.CloseFile(paths.dom)
		w.pool.CloseFile(paths.dev)
		w.sessions.Delete(key)
		return true
	})
}

func (w *SessionWriter) Info() string {
	return fmt.Sprintf("open FDs: %d/%d", w.pool.OpenCount(), w.pool.limit)
}
