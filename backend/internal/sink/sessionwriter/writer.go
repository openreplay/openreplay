package sessionwriter

import (
	"fmt"
	"log"
	"math"
	"sync"
	"time"
)

type SessionWriter struct {
	ulimit   int
	dir      string
	lock     *sync.Mutex
	sessions *sync.Map
	meta     map[uint64]int64
	count    int
	done     chan struct{}
	stopped  chan struct{}
}

func NewWriter(ulimit uint16, dir string) *SessionWriter {
	w := &SessionWriter{
		ulimit:   int(ulimit),
		dir:      dir + "/",
		lock:     &sync.Mutex{},
		sessions: &sync.Map{},
		meta:     make(map[uint64]int64, ulimit),
		done:     make(chan struct{}),
		stopped:  make(chan struct{}),
	}
	go w.synchronizer()
	return w
}

func (w *SessionWriter) WriteDOM(sid uint64, data []byte) error {
	return w.write(sid, DOM, data)
}

func (w *SessionWriter) WriteDEV(sid uint64, data []byte) error {
	return w.write(sid, DEV, data)
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
	count := w.count
	w.lock.Unlock()
	return fmt.Sprintf("%d files", count)
}

func (w *SessionWriter) write(sid uint64, mode FileType, data []byte) error {
	var (
		sess *Session
		err  error
	)

	sessObj, ok := w.sessions.Load(sid)
	if !ok {
		sess, err = NewSession(w.dir, sid)
		if err != nil {
			return fmt.Errorf("can't write to session: %d, err: %s", sid, err)
		}
		sess.Lock()
		defer sess.Unlock()
		w.sessions.Store(sid, sess)

		// Check opened files limit
		w.meta[sid] = time.Now().Unix()
		if len(w.meta) >= w.ulimit {
			var oldSessID uint64
			var minTimestamp int64 = math.MaxInt64
			for sessID, timestamp := range w.meta {
				if timestamp < minTimestamp {
					oldSessID = sessID
					minTimestamp = timestamp
				}
			}
			delete(w.meta, oldSessID)
			if err := w.close(oldSessID); err != nil {
				log.Printf("can't close session: %s", err)
			}
		}
	} else {
		sess = sessObj.(*Session)
		sess.Lock()
		defer sess.Unlock()
	}

	// Update info
	w.lock.Lock()
	w.count = len(w.meta)
	w.lock.Unlock()

	// Write data to session
	return sess.Write(mode, data)
}

func (w *SessionWriter) sync(sid uint64) error {
	sessObj, ok := w.sessions.Load(sid)
	if !ok {
		return fmt.Errorf("can't sync, session: %d not found", sid)
	}
	sess := sessObj.(*Session)
	sess.Lock()
	defer sess.Unlock()

	return sess.Sync()
}

func (w *SessionWriter) close(sid uint64) error {
	sessObj, ok := w.sessions.LoadAndDelete(sid)
	if !ok {
		return fmt.Errorf("can't close, session: %d not found", sid)
	}
	sess := sessObj.(*Session)
	sess.Lock()
	defer sess.Unlock()

	if err := sess.Sync(); err != nil {
		log.Printf("can't sync session: %d, err: %s", sid, err)
	}
	err := sess.Close()
	return err
}

func (w *SessionWriter) synchronizer() {
	tick := time.Tick(2 * time.Second)
	for {
		select {
		case <-tick:
			w.sessions.Range(func(sid, lockObj any) bool {
				if err := w.sync(sid.(uint64)); err != nil {
					log.Printf("can't sync file descriptor: %s", err)
				}
				return true
			})
		case <-w.done:
			w.sessions.Range(func(sid, lockObj any) bool {
				if err := w.close(sid.(uint64)); err != nil {
					log.Printf("can't close file descriptor: %s", err)
				}
				return true
			})
			w.stopped <- struct{}{}
			return
		}
	}
}
