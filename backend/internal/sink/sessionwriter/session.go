package sessionwriter

import (
	"encoding/binary"
	"fmt"
	"openreplay/backend/pkg/messages"
	"os"
	"strconv"
	"sync"
)

type Session struct {
	lock    *sync.Mutex
	dom     *os.File
	dev     *os.File
	index   []byte
	updated bool
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
		lock:    &sync.Mutex{},
		dom:     domFile,
		dev:     devFile,
		index:   make([]byte, 8),
		updated: false,
	}, nil
}

func (s *Session) Lock() {
	s.lock.Lock()
}

func (s *Session) Unlock() {
	s.lock.Unlock()
}

func (s *Session) Write(msg messages.Message) (err error) {
	// Message index
	binary.LittleEndian.PutUint64(s.index, msg.Meta().Index)
	// Write index and data to file
	if messages.IsDOMType(msg.TypeID()) {
		_, err = s.dom.Write(s.index)
		_, err = s.dom.Write(msg.Encode())
		if err != nil {
			return err
		}
	}
	s.updated = true
	if !messages.IsDOMType(msg.TypeID()) || msg.TypeID() == messages.MsgTimestamp {
		_, err = s.dev.Write(s.index)
		_, err = s.dev.Write(msg.Encode())
		if err != nil {
			return err
		}
	}
	return nil
}

func (s *Session) Sync() error {
	if !s.updated {
		return nil
	}
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
