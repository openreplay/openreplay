package sessionwriter

import (
	"fmt"
	"log"
	"math"
	"openreplay/backend/pkg/messages"
	"sync"
	"time"
)

type SessionWriter struct {
	ulimit   int
	dir      string
	lock     *sync.Mutex
	sessions map[uint64]*Session
	meta     map[uint64]int64
	edited   map[uint64]bool
	toSync   chan *Session
	done     chan struct{}
	stopped  chan struct{}
	synced   int
}

func NewWriter(ulimit uint16, dir string, zombieSessionTimeout int64) *SessionWriter {
	w := &SessionWriter{
		ulimit:   int(ulimit) / 2, // should divide by 2 because each session has 2 files
		dir:      dir + "/",
		lock:     &sync.Mutex{},
		sessions: make(map[uint64]*Session, ulimit),
		meta:     make(map[uint64]int64, ulimit),
		edited:   make(map[uint64]bool, ulimit),
		toSync:   make(chan *Session, ulimit),
		done:     make(chan struct{}),
		stopped:  make(chan struct{}),
	}
	go w.synchronizer()
	return w
}

func (w *SessionWriter) Write(msg messages.Message) error {
	return w.write(msg)
}

func (w *SessionWriter) Close(sid uint64) {
	w.close(sid)
}

func (w *SessionWriter) Stop() {
	w.done <- struct{}{}
	<-w.stopped
}

func (w *SessionWriter) Info() string {
	w.lock.Lock()
	sess := len(w.meta)
	sync := w.synced
	w.synced = 0
	w.lock.Unlock()
	return fmt.Sprintf("%d sessions, %d synced", sess, sync)
}

func (w *SessionWriter) addSession(sid uint64) {
	w.lock.Lock()
	w.meta[sid] = time.Now().Unix()
	w.lock.Unlock()
}

func (w *SessionWriter) deleteSession(sid uint64) {
	w.lock.Lock()
	delete(w.meta, sid)
	w.lock.Unlock()
}

func (w *SessionWriter) numberOfSessions() int {
	w.lock.Lock()
	defer w.lock.Unlock()
	return len(w.meta)
}

func (w *SessionWriter) write(msg messages.Message) error {
	var (
		sess *Session
		err  error
	)
	sid := msg.SessionID()

	// Try to get session
	w.lock.Lock()
	sess, ok := w.sessions[sid]
	w.edited[sid] = true
	w.lock.Unlock()

	if !ok {
		// Open/create session file
		sess, err = NewSession(w.dir, sid)
		if err != nil {
			return fmt.Errorf("can't write to session: %d, err: %s", sid, err)
		}

		// Check opened files limit
		if len(w.meta) >= w.ulimit {
			var oldSessID uint64
			var minTimestamp int64 = math.MaxInt64
			for sessID, timestamp := range w.meta {
				if timestamp < minTimestamp {
					oldSessID = sessID
					minTimestamp = timestamp
				}
			}
			if err := w.close(oldSessID); err != nil {
				log.Printf("can't close session: %s", err)
			}
		}

		// Add new session
		w.lock.Lock()
		w.meta[sid] = time.Now().Unix()
		w.sessions[sid] = sess
		w.lock.Unlock()
	}

	// Write data to session
	sess.Lock()
	err = sess.Write(msg)
	sess.Unlock()

	return err
}

func (w *SessionWriter) close(sid uint64) error {
	w.lock.Lock()
	sess, ok := w.sessions[sid]
	w.lock.Unlock()
	if !ok {
		return fmt.Errorf("session: %d not found", sid)
	}
	sess.Lock()
	if err := sess.Sync(); err != nil {
		log.Printf("can't sync session: %d, err: %s", sid, err)
	}
	err := sess.Close()
	sess.Unlock()

	w.lock.Lock()
	delete(w.sessions, sid)
	delete(w.meta, sid)
	delete(w.edited, sid)
	w.lock.Unlock()
	return err
}

func (w *SessionWriter) synchronizer() {
	tick := time.Tick(5 * time.Second)
	for {
		select {
		case <-tick:
			w.lock.Lock()
			for sid, _ := range w.edited {
				if sess, ok := w.sessions[sid]; ok {
					w.toSync <- sess
					w.synced++
				}
			}
			w.edited = make(map[uint64]bool, w.ulimit)
			w.lock.Unlock()
		case sess := <-w.toSync:
			sess.Lock()
			err := sess.Sync()
			sess.Unlock()
			if err != nil {
				log.Printf("can't sync: %s", err)
			}
		case <-w.done:
			for sid, _ := range w.sessions {
				if err := w.close(sid); err != nil {
					log.Printf("can't close session: %s", err)
				}
			}
			w.stopped <- struct{}{}
			return
		}
	}
}
