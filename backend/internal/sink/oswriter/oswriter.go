package oswriter

import (
	"fmt"
	"log"
	"math"
	"os"
	"strconv"
	"sync"
	"time"
)

type FileType int

const (
	DOM FileType = 1
	DEV FileType = 2
)

type Writer struct {
	ulimit   int
	dir      string
	mu       *sync.Mutex // global mutex for map of file descriptors
	files    map[uint64]*os.File
	devtools map[uint64]*os.File
	atimes   map[uint64]int64
	locks    *sync.Map // mutex for each file descriptor in general to prevent write and sync operations at the same time
	toClose  chan uint64
	done     chan struct{}
	finished chan struct{}
}

func NewWriter(ulimit uint16, dir string) *Writer {
	w := &Writer{
		ulimit:   int(ulimit),
		dir:      dir + "/",
		mu:       &sync.Mutex{},
		files:    make(map[uint64]*os.File, 1024),
		devtools: make(map[uint64]*os.File, 1024),
		atimes:   make(map[uint64]int64, 1024),
		locks:    &sync.Map{},
		toClose:  make(chan uint64, 1024),
		done:     make(chan struct{}),
		finished: make(chan struct{}),
	}
	// Run async file synchronization
	go w.synchronizer()
	return w
}

func (w *Writer) getDOM(key uint64) *os.File {
	w.mu.Lock()
	defer w.mu.Unlock()
	return w.files[key]
}

func (w *Writer) getDEV(key uint64) *os.File {
	w.mu.Lock()
	defer w.mu.Unlock()
	return w.devtools[key]
}

func (w *Writer) synchronizer() {
	tick := time.Tick(2 * time.Second)
	for {
		select {
		case <-tick:
			// Sync files every 2 minutes
			w.locks.Range(func(sessID, lock any) bool {
				// Lock session's files
				id := sessID.(uint64)
				mu := lock.(*sync.Mutex)
				mu.Lock()
				// Sync dom.mob
				if file := w.getDOM(id); file != nil {
					if err := file.Sync(); err != nil {
						log.Printf("can't sync file: %s", err)
					}
				}
				// Sync devtools.mob
				if file := w.getDEV(id); file != nil {
					if err := file.Sync(); err != nil {
						log.Printf("can't sync file: %s", err)
					}
				}
				// Unlock session's files
				mu.Unlock()
				return true
			})
		case sessionID := <-w.toClose:
			if err := w.close(sessionID); err != nil {
				log.Printf("can't close file descriptor: %s", err)
			}
		case <-w.done:
			w.finished <- struct{}{}
			return
		}
	}
}

func (w *Writer) open(key uint64, mode FileType) (*os.File, error) {
	if mode == DOM {
		if file := w.getDOM(key); file != nil {
			return file, nil
		}
	} else {
		if file := w.getDEV(key); file != nil {
			return file, nil
		}
	}

	if len(w.atimes) >= w.ulimit {
		var m_k uint64
		var m_t int64 = math.MaxInt64
		for k, t := range w.atimes {
			if t < m_t {
				m_k = k
				m_t = t
			}
		}
		if err := w.Close(m_k); err != nil {
			return nil, err
		}
	}
	filePath := w.dir + strconv.FormatUint(key, 10)
	if mode == DEV {
		filePath += "devtools"
	}
	file, err := os.OpenFile(filePath, os.O_WRONLY|os.O_CREATE|os.O_APPEND, 0644)
	if err != nil {
		return nil, err
	}

	var mu *sync.Mutex
	lock, ok := w.locks.Load(key)
	if !ok {
		mu = &sync.Mutex{}
		mu.Lock()
		w.locks.Store(key, mu)
	} else {
		mu = lock.(*sync.Mutex)
		mu.Lock()
	}

	w.mu.Lock()
	if mode == DOM {
		w.files[key] = file
	} else {
		w.devtools[key] = file
	}
	w.atimes[key] = time.Now().Unix()
	w.mu.Unlock()

	mu.Unlock()
	return file, nil
}

func (w *Writer) Close(key uint64) error {
	w.toClose <- key
	return nil
}

func (w *Writer) close(key uint64) error {
	lock, loaded := w.locks.LoadAndDelete(key)
	if !loaded {
		return fmt.Errorf("file not found, sess: %d", key)
	}
	mu := lock.(*sync.Mutex)
	mu.Lock()

	// Close dom file
	file := w.getDOM(key)
	if file != nil {
		if err := file.Sync(); err != nil {
			return err
		}
		if err := file.Close(); err != nil {
			return err
		}
		w.mu.Lock()
		delete(w.files, key)
		delete(w.atimes, key)
		w.mu.Unlock()
	}

	// Close dev file
	file = w.getDEV(key)
	if file != nil {
		if err := file.Sync(); err != nil {
			return err
		}
		if err := file.Close(); err != nil {
			return err
		}
		w.mu.Lock()
		delete(w.devtools, key)
		w.mu.Unlock()
	}

	mu.Unlock()
	return nil
}

func (w *Writer) WriteDOM(key uint64, data []byte) error {
	return w.Write(key, DOM, data)
}

func (w *Writer) WriteDEV(key uint64, data []byte) error {
	return w.Write(key, DEV, data)
}

func (w *Writer) Write(key uint64, mode FileType, data []byte) error {
	file, err := w.open(key, mode)
	if err != nil {
		return err
	}
	// Write data to file
	lock, _ := w.locks.Load(key)
	mu := lock.(*sync.Mutex)
	mu.Lock()
	_, err = file.Write(data)
	mu.Unlock()

	return err
}

func (w *Writer) Info() string {
	return fmt.Sprintf("dom: %d, dev: %d", len(w.files), len(w.devtools))
}

func (w *Writer) Stop() {
	w.done <- struct{}{}
	<-w.finished
	if err := w.CloseAll(); err != nil {
		log.Printf("closeAll err: %s", err)
	}
}

func (w *Writer) CloseAll() error {
	for _, file := range w.files {
		if err := file.Sync(); err != nil {
			return err
		}
		if err := file.Close(); err != nil {
			return err
		}
	}
	w.files = nil
	for _, file := range w.devtools {
		if err := file.Sync(); err != nil {
			return err
		}
		if err := file.Close(); err != nil {
			return err
		}
	}
	w.devtools = nil
	w.atimes = nil
	return nil
}
