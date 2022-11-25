package sessionwriter

import (
	"encoding/binary"
	"fmt"
	"strconv"
	"sync"

	"openreplay/backend/pkg/messages"
)

type Session struct {
	lock    *sync.Mutex
	dom     *File
	dev     *File
	index   []byte
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
		index:   make([]byte, 8),
		updated: false,
	}, nil
}

func (s *Session) Write(msg messages.Message) error {
	s.lock.Lock()
	defer s.lock.Unlock()

	// Encode message index
	binary.LittleEndian.PutUint64(s.index, msg.Meta().Index)

	// Write message to dom.mob file
	if messages.IsDOMType(msg.TypeID()) {
		// Write message index
		if err := s.dom.Write(s.index); err != nil {
			return err
		}
		// Write message body
		if err := s.dom.Write(msg.Encode()); err != nil {
			return err
		}
	}
	s.updated = true
	// Write message to dev.mob file
	if !messages.IsDOMType(msg.TypeID()) || msg.TypeID() == messages.MsgTimestamp {
		// Write message index
		if err := s.dev.Write(s.index); err != nil {
			return err
		}
		// Write message body
		if err := s.dev.Write(msg.Encode()); err != nil {
			return err
		}
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
