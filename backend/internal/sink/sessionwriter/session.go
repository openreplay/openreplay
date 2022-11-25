package sessionwriter

import (
	"fmt"
	"os"
	"strconv"
	"sync"
	"time"
)

type Session struct {
	lock       *sync.Mutex
	dom        *os.File
	dev        *os.File
	lastUpdate time.Time
}

func NewSession(dir string, id uint64) (*Session, error) {
	if id == 0 {
		return nil, fmt.Errorf("wrong session id")
	}

	filePath := dir + strconv.FormatUint(id, 10)
	domFile, err := os.OpenFile(filePath, os.O_WRONLY|os.O_CREATE|os.O_APPEND, 0644)
	if err != nil {
		return nil, err
	}
	filePath += "devtools"
	devFile, err := os.OpenFile(filePath, os.O_WRONLY|os.O_CREATE|os.O_APPEND, 0644)
	if err != nil {
		domFile.Close() // should close first file descriptor
		return nil, err
	}

	return &Session{
		lock:       &sync.Mutex{},
		dom:        domFile,
		dev:        devFile,
		lastUpdate: time.Now(),
	}, nil
}

func (s *Session) Lock() {
	s.lock.Lock()
}

func (s *Session) Unlock() {
	s.lock.Unlock()
}

func (s *Session) Write(mode FileType, data []byte) (err error) {
	if mode == DOM {
		_, err = s.dom.Write(data)
	} else {
		_, err = s.dev.Write(data)
	}
	s.lastUpdate = time.Now()
	return err
}

func (s *Session) LastUpdate() time.Time {
	return s.lastUpdate
}

func (s *Session) Sync() error {
	domErr := s.dom.Sync()
	devErr := s.dev.Sync()
	if domErr == nil && devErr == nil {
		return nil
	}
	return fmt.Errorf("dom: %s, dev: %s", domErr, devErr)
}

func (s *Session) Close() error {
	domErr := s.dom.Close()
	devErr := s.dev.Close()
	if domErr == nil && devErr == nil {
		return nil
	}
	return fmt.Errorf("dom: %s, dev: %s", domErr, devErr)
}
