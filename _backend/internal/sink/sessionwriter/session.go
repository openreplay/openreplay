package sessionwriter

import (
	"fmt"
	"strconv"
	"sync"
)

type Session struct {
	lock    *sync.Mutex
	dom     *File
	dev     *File
	updated bool
}

func NewSession(sessID uint64, workDir string, bufSize int) (*Session, error) {
	if sessID == 0 {
		return nil, fmt.Errorf("wrong session id")
	}
	filePath := workDir + strconv.FormatUint(sessID, 10)

	dom, err := NewFile(filePath, bufSize)
	if err != nil {
		return nil, err
	}
	dev, err := NewFile(filePath+"devtools", bufSize)
	if err != nil {
		dom.Close()
		return nil, err
	}

	return &Session{
		lock:    &sync.Mutex{},
		dom:     dom,
		dev:     dev,
		updated: false,
	}, nil
}

func (s *Session) Write(domBuffer, devBuffer []byte) error {
	s.lock.Lock()
	defer s.lock.Unlock()

	// Write dom buffer to the file (file buffer)
	if err := s.dom.Write(domBuffer); err != nil {
		return err
	}

	// Write dev buffer to the file (file buffer)
	if err := s.dev.Write(devBuffer); err != nil {
		return err
	}
	return nil
}

func (s *Session) Sync() error {
	s.lock.Lock()
	defer s.lock.Unlock()

	if err := s.dom.Sync(); err != nil {
		return err
	}
	return s.dev.Sync()
}

func (s *Session) Close() error {
	s.lock.Lock()
	defer s.lock.Unlock()

	if err := s.dom.Close(); err != nil {
		return err
	}
	return s.dev.Close()
}
