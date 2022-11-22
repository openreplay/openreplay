package sessionwriter

import (
	"fmt"
	"log"
	"math"
	"sync"
	"time"
)

type SessionWriter struct {
	ulimit               int
	dir                  string
	zombieSessionTimeout float64
	lock                 *sync.Mutex
	sessions             *sync.Map
	meta                 map[uint64]int64
	done                 chan struct{}
	stopped              chan struct{}
}

func NewWriter(ulimit uint16, dir string, zombieSessionTimeout int64) *SessionWriter {
	w := &SessionWriter{
		ulimit:               int(ulimit) / 2, // should divide by 2 because each session has 2 files
		dir:                  dir + "/",
		zombieSessionTimeout: float64(zombieSessionTimeout),
		lock:                 &sync.Mutex{},
		sessions:             &sync.Map{},
		meta:                 make(map[uint64]int64, ulimit),
		done:                 make(chan struct{}),
		stopped:              make(chan struct{}),
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
	return fmt.Sprintf("%d files", w.numberOfSessions())
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

		// Add new session to manager
		w.sessions.Store(sid, sess)
		w.addSession(sid)
	} else {
		sess = sessObj.(*Session)
		sess.Lock()
		defer sess.Unlock()
	}

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

	err := sess.Sync()
	if time.Now().Sub(sess.LastUpdate()).Seconds() > w.zombieSessionTimeout {
		if err != nil {
			log.Printf("can't sync session: %d, err: %s", sid, err)
		}
		// Close "zombie" session
		err = sess.Close()
		w.deleteSession(sid)
	}
	return err
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
	w.deleteSession(sid)
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
