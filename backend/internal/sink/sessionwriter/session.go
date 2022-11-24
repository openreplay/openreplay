package sessionwriter

import (
	"bufio"
	"encoding/binary"
	"fmt"
	"openreplay/backend/pkg/messages"
	"os"
	"strconv"
	"sync"
	"time"
)

type Session struct {
	lock       *sync.Mutex
	domFile    *os.File
	devFile    *os.File
	dom        *bufio.Writer
	dev        *bufio.Writer
	lastUpdate time.Time // TODO: keep for timeout logic
	index      []byte
	updated    bool // TODO: try with timeout to write data once in N minutes
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
		domFile: domFile,
		devFile: devFile,
		dom:     bufio.NewWriter(domFile),
		dev:     bufio.NewWriter(domFile),
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
	//
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
	if err := s.dom.Flush(); err != nil {
		return err
	}
	if err := s.domFile.Sync(); err != nil {
		return err
	}
	if err := s.dev.Flush(); err != nil {
		return err
	}
	if err := s.devFile.Sync(); err != nil {
		return err
	}
	return nil
}

func (s *Session) Close() error {
	if err := s.domFile.Close(); err != nil {
		return err
	}
	if err := s.devFile.Close(); err != nil {
		return err
	}
	return nil
}
