package sessionwriter

import (
	"bufio"
	"errors"
	"math"
	"os"
	"sync"
	"time"

	"openreplay/backend/pkg/logger"
)

var ErrSizeLimitExceeded = errors.New("file size limit exceeded")

type fileEntry struct {
	path    string
	file    *os.File
	buffer  *bufio.Writer
	updated bool
	size    int64
}

func (e *fileEntry) write(data []byte) error {
	e.updated = true
	e.size += int64(len(data))
	_, err := e.buffer.Write(data)
	return err
}

func (e *fileEntry) sync() error {
	if !e.updated {
		return nil
	}
	if err := e.buffer.Flush(); err != nil {
		return err
	}
	if err := e.file.Sync(); err != nil {
		return err
	}
	e.updated = false
	return nil
}

func (e *fileEntry) close() error {
	_ = e.buffer.Flush()
	_ = e.file.Sync()
	return e.file.Close()
}

type FilePool struct {
	mu          sync.Mutex
	log         logger.Logger
	limit       int
	bufSize     int
	entries     map[string]*fileEntry
	lastUse     map[string]int64
	maxFileSize int64
}

func NewFilePool(log logger.Logger, limit, bufSize int, maxFileSize int64) *FilePool {
	return &FilePool{
		log:         log,
		limit:       limit,
		bufSize:     bufSize,
		entries:     make(map[string]*fileEntry, limit),
		lastUse:     make(map[string]int64, limit),
		maxFileSize: maxFileSize,
	}
}

func (p *FilePool) Write(path string, header, data []byte) error {
	p.mu.Lock()
	defer p.mu.Unlock()

	entry, isNew, err := p.ensureOpen(path)
	if err != nil {
		return err
	}
	p.lastUse[path] = time.Now().UnixNano()

	if p.maxFileSize > 0 && entry.size >= p.maxFileSize {
		return ErrSizeLimitExceeded
	}

	if isNew && header != nil && len(header) > 0 {
		if err := entry.write(header); err != nil {
			return err
		}
	}

	return entry.write(data)
}

func (p *FilePool) ensureOpen(path string) (*fileEntry, bool, error) {
	if entry, ok := p.entries[path]; ok {
		return entry, false, nil
	}
	if len(p.entries) >= p.limit {
		p.evictOne()
	}
	f, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_APPEND, 0644)
	if err != nil {
		return nil, false, err
	}
	info, err := f.Stat()
	if err != nil {
		_ = f.Close()
		return nil, false, err
	}
	entry := &fileEntry{
		path:   path,
		file:   f,
		buffer: bufio.NewWriterSize(f, p.bufSize),
		size:   info.Size(),
	}
	p.entries[path] = entry
	return entry, info.Size() == 0, nil
}

func (p *FilePool) evictOne() {
	var evictPath string
	var minTS int64 = math.MaxInt64
	for path, ts := range p.lastUse {
		if ts < minTS {
			minTS = ts
			evictPath = path
		}
	}
	if evictPath == "" {
		return
	}
	if entry, ok := p.entries[evictPath]; ok {
		_ = entry.close()
	}
	delete(p.entries, evictPath)
	delete(p.lastUse, evictPath)
}

func (p *FilePool) Sync() {
	p.mu.Lock()
	defer p.mu.Unlock()

	for _, entry := range p.entries {
		_ = entry.sync()
	}
}

func (p *FilePool) CloseFile(path string) {
	p.mu.Lock()
	defer p.mu.Unlock()

	if entry, ok := p.entries[path]; ok {
		_ = entry.close()
		delete(p.entries, path)
		delete(p.lastUse, path)
	}
}

func (p *FilePool) Stop() {
	p.mu.Lock()
	defer p.mu.Unlock()

	for path, entry := range p.entries {
		_ = entry.close()
		delete(p.entries, path)
		delete(p.lastUse, path)
	}
}

func (p *FilePool) OpenCount() int {
	p.mu.Lock()
	defer p.mu.Unlock()
	return len(p.entries)
}
