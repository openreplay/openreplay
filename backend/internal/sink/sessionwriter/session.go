package sessionwriter

import (
	"bufio"
	"encoding/binary"
	"fmt"
	"io"
	"openreplay/backend/pkg/messages"
	"os"
	"strconv"
	"sync"
)

type Session struct {
	lock    *sync.Mutex
	domFile *os.File
	devFile *os.File
	dom     *bufio.Writer
	dev     *bufio.Writer
	index   []byte
	updated bool
}

func NewSession(sessID uint64, workDir string, bufSize int) (*Session, error) {
	if sessID == 0 {
		return nil, fmt.Errorf("wrong session id")
	}

	filePath := workDir + strconv.FormatUint(sessID, 10)
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
		dom:     bufio.NewWriterSize(domFile, bufSize),
		dev:     bufio.NewWriterSize(devFile, bufSize),
		index:   make([]byte, 8),
		updated: false,
	}, nil
}

func (s *Session) write(w io.Writer, data []byte) error {
	leftToWrite := len(data)
	for leftToWrite > 0 {
		writtenDown, err := w.Write(data)
		if err != nil {
			return err
		}
		leftToWrite -= writtenDown
	}
	return nil
}

func (s *Session) Write(msg messages.Message) error {
	s.lock.Lock()
	defer s.lock.Unlock()

	// Encode message index
	binary.LittleEndian.PutUint64(s.index, msg.Meta().Index)

	// Write message to dom.mob file
	if messages.IsDOMType(msg.TypeID()) {
		// Write message index
		if err := s.write(s.dom, s.index); err != nil {
			return err
		}
		// Write message body
		if err := s.write(s.dom, msg.Encode()); err != nil {
			return err
		}
	}
	s.updated = true
	// Write message to dev.mob file
	if !messages.IsDOMType(msg.TypeID()) || msg.TypeID() == messages.MsgTimestamp {
		// Write message index
		if err := s.write(s.dev, s.index); err != nil {
			return err
		}
		// Write message body
		if err := s.write(s.dev, msg.Encode()); err != nil {
			return err
		}
	}
	return nil
}

func (s *Session) Sync() error {
	s.lock.Lock()
	defer s.lock.Unlock()

	return s.sync()
}

func (s *Session) sync() error {
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
	s.updated = false
	return nil
}

func (s *Session) Close() error {
	s.lock.Lock()
	s.lock.Unlock()

	_ = s.sync()
	return s.close()
}

func (s *Session) close() error {
	if err := s.domFile.Close(); err != nil {
		return err
	}
	if err := s.devFile.Close(); err != nil {
		return err
	}
	return nil
}
