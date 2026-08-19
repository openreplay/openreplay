package audit

import (
	"context"
	"sync"
	"time"

	"github.com/lib/pq"

	"openreplay/backend/pkg/logger"
)

const (
	flushBatchSize = 500
	flushInterval  = 5 * time.Second
	maxBufferSize  = 100000
)

type Store interface {
	Exec(sql string, args ...interface{}) error
}

type Writer struct {
	log  logger.Logger
	db   Store
	mu   sync.Mutex
	buf  []int64
	stop chan struct{}
	done chan struct{}
}

func NewWriter(log logger.Logger, db Store) *Writer {
	w := &Writer{
		log:  log,
		db:   db,
		buf:  make([]int64, 0, flushBatchSize),
		stop: make(chan struct{}),
		done: make(chan struct{}),
	}
	go w.run()
	return w
}

func (w *Writer) Add(sessionID uint64) {
	w.mu.Lock()
	if len(w.buf) >= maxBufferSize {
		w.mu.Unlock()
		w.log.Error(context.Background(), "sessions audit buffer overflow, dropping mark for session %d", sessionID)
		return
	}
	w.buf = append(w.buf, int64(sessionID))
	full := len(w.buf) >= flushBatchSize
	w.mu.Unlock()
	if full {
		w.flush()
	}
}

func (w *Writer) run() {
	defer close(w.done)
	ticker := time.NewTicker(flushInterval)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			w.flush()
		case <-w.stop:
			w.flush()
			return
		}
	}
}

func (w *Writer) flush() {
	w.mu.Lock()
	if len(w.buf) == 0 {
		w.mu.Unlock()
		return
	}
	batch := w.buf
	w.buf = make([]int64, 0, flushBatchSize)
	w.mu.Unlock()

	err := w.db.Exec(`
		INSERT INTO sessions_audit (session_id, end_seen_at)
		SELECT DISTINCT s, timezone('utc', now())
		FROM unnest($1::bigint[]) AS s
		ON CONFLICT (session_id) DO NOTHING`,
		pq.Array(batch))
	if err == nil {
		return
	}

	w.mu.Lock()
	requeued := len(w.buf)+len(batch) <= maxBufferSize
	if requeued {
		w.buf = append(batch, w.buf...)
	}
	w.mu.Unlock()
	if requeued {
		w.log.Error(context.Background(), "sessions audit flush failed, will retry %d marks: %s", len(batch), err)
	} else {
		w.log.Error(context.Background(), "sessions audit flush failed, dropping %d marks on overflow: %s", len(batch), err)
	}
}

func (w *Writer) Close() {
	close(w.stop)
	<-w.done
}
