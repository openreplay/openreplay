package storage

import (
	"bytes"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	config "openreplay/backend/internal/config/storage"
	"openreplay/backend/pkg/messages"
	metrics "openreplay/backend/pkg/metrics/storage"
	"openreplay/backend/pkg/storage"

	gzip "github.com/klauspost/pgzip"
)

type FileType string

const (
	DOM FileType = "/dom.mob"
	DEV FileType = "/devtools.mob"
)

func (t FileType) String() string {
	if t == DOM {
		return "dom"
	}
	return "devtools"
}

type Task struct {
	id   string
	doms *bytes.Buffer
	dome *bytes.Buffer
	dev  *bytes.Buffer
}

type Storage struct {
	cfg        *config.Config
	s3         *storage.S3
	startBytes []byte
	tasks      chan *Task
	ready      chan struct{}
}

func New(cfg *config.Config, s3 *storage.S3) (*Storage, error) {
	switch {
	case cfg == nil:
		return nil, fmt.Errorf("config is empty")
	case s3 == nil:
		return nil, fmt.Errorf("s3 storage is empty")
	}
	newStorage := &Storage{
		cfg:        cfg,
		s3:         s3,
		startBytes: make([]byte, cfg.FileSplitSize),
		tasks:      make(chan *Task, 1),
		ready:      make(chan struct{}),
	}
	go newStorage.worker()
	return newStorage, nil
}

func (s *Storage) Wait() {
	<-s.ready
}

func (s *Storage) Upload(msg *messages.SessionEnd) (err error) {
	// Generate file path
	sessionID := strconv.FormatUint(msg.SessionID(), 10)
	filePath := s.cfg.FSDir + "/" + sessionID
	// Prepare sessions
	newTask := &Task{
		id: sessionID,
	}
	wg := &sync.WaitGroup{}
	wg.Add(2)
	go func() {
		if prepErr := s.prepareSession(filePath, DOM, newTask); prepErr != nil {
			err = fmt.Errorf("prepareSession DOM err: %s", prepErr)
		}
		wg.Done()
	}()
	go func() {
		if prepErr := s.prepareSession(filePath, DEV, newTask); prepErr != nil {
			err = fmt.Errorf("prepareSession DEV err: %s", prepErr)
		}
		wg.Done()
	}()
	wg.Wait()
	if err != nil {
		if strings.Contains(err.Error(), "big file") {
			log.Printf("%s, sess: %d", err, msg.SessionID())
			return nil
		}
		return err
	}
	// Send new task to worker
	s.tasks <- newTask
	// Unload worker
	<-s.ready
	return nil
}

func (s *Storage) openSession(filePath string, tp FileType) ([]byte, error) {
	// Check file size before download into memory
	info, err := os.Stat(filePath)
	if err == nil && info.Size() > s.cfg.MaxFileSize {
		return nil, fmt.Errorf("big file, size: %d", info.Size())
	}
	// Read file into memory
	raw, err := os.ReadFile(filePath)
	if err != nil {
		return nil, err
	}
	if !s.cfg.UseSort {
		return raw, nil
	}
	start := time.Now()
	res, err := s.sortSessionMessages(raw)
	if err != nil {
		return nil, fmt.Errorf("can't sort session, err: %s", err)
	}
	metrics.RecordSessionSortDuration(float64(time.Now().Sub(start).Milliseconds()), tp.String())
	return res, nil
}

func (s *Storage) sortSessionMessages(raw []byte) ([]byte, error) {
	// Parse messages, sort by index and save result into slice of bytes
	unsortedMessages, err := messages.SplitMessages(raw)
	if err != nil {
		log.Printf("can't sort session, err: %s", err)
		return raw, nil
	}
	return messages.MergeMessages(raw, messages.SortMessages(unsortedMessages)), nil
}

func (s *Storage) prepareSession(path string, tp FileType, task *Task) error {
	// Open mob file
	if tp == DEV {
		path += "devtools"
	}
	startRead := time.Now()
	mob, err := s.openSession(path, tp)
	if err != nil {
		return err
	}
	metrics.RecordSessionSize(float64(len(mob)), tp.String())
	metrics.RecordSessionReadDuration(float64(time.Now().Sub(startRead).Milliseconds()), tp.String())

	// Encode and compress session
	if tp == DEV {
		start := time.Now()
		task.dev = s.compressSession(mob)
		metrics.RecordSessionCompressDuration(float64(time.Now().Sub(start).Milliseconds()), tp.String())
	} else {
		if len(mob) <= s.cfg.FileSplitSize {
			start := time.Now()
			task.doms = s.compressSession(mob)
			metrics.RecordSessionCompressDuration(float64(time.Now().Sub(start).Milliseconds()), tp.String())
			return nil
		}
		wg := &sync.WaitGroup{}
		wg.Add(2)
		var firstPart, secondPart int64
		go func() {
			start := time.Now()
			task.doms = s.compressSession(mob[:s.cfg.FileSplitSize])
			firstPart = time.Now().Sub(start).Milliseconds()
			wg.Done()
		}()
		go func() {
			start := time.Now()
			task.dome = s.compressSession(mob[s.cfg.FileSplitSize:])
			secondPart = time.Now().Sub(start).Milliseconds()
			wg.Done()
		}()
		wg.Wait()
		metrics.RecordSessionCompressDuration(float64(firstPart+secondPart), tp.String())
	}
	return nil
}

func (s *Storage) encryptSession(data []byte, encryptionKey string) []byte {
	var encryptedData []byte
	var err error
	if encryptionKey != "" {
		encryptedData, err = EncryptData(data, []byte(encryptionKey))
		if err != nil {
			log.Printf("can't encrypt data: %s", err)
			encryptedData = data
		}
	} else {
		encryptedData = data
	}
	return encryptedData
}

func (s *Storage) compressSession(data []byte) *bytes.Buffer {
	zippedMob := new(bytes.Buffer)
	z, _ := gzip.NewWriterLevel(zippedMob, gzip.BestSpeed)
	if _, err := z.Write(data); err != nil {
		log.Printf("can't write session data to compressor: %s", err)
	}
	if err := z.Close(); err != nil {
		log.Printf("can't close compressor: %s", err)
	}
	return zippedMob
}

func (s *Storage) uploadSession(task *Task) {
	wg := &sync.WaitGroup{}
	wg.Add(3)
	var (
		uploadDoms int64 = 0
		uploadDome int64 = 0
		uploadDev  int64 = 0
	)
	go func() {
		if task.doms != nil {
			start := time.Now()
			if err := s.s3.Upload(task.doms, task.id+string(DOM)+"s", "application/octet-stream", true); err != nil {
				log.Fatalf("Storage: start upload failed.  %s", err)
			}
			uploadDoms = time.Now().Sub(start).Milliseconds()
		}
		wg.Done()
	}()
	go func() {
		if task.dome != nil {
			start := time.Now()
			if err := s.s3.Upload(task.dome, task.id+string(DOM)+"e", "application/octet-stream", true); err != nil {
				log.Fatalf("Storage: start upload failed.  %s", err)
			}
			uploadDome = time.Now().Sub(start).Milliseconds()
		}
		wg.Done()
	}()
	go func() {
		if task.dev != nil {
			start := time.Now()
			if err := s.s3.Upload(task.dev, task.id+string(DEV), "application/octet-stream", true); err != nil {
				log.Fatalf("Storage: start upload failed.  %s", err)
			}
			uploadDev = time.Now().Sub(start).Milliseconds()
		}
		wg.Done()
	}()
	wg.Wait()
	metrics.RecordSessionUploadDuration(float64(uploadDoms+uploadDome), DOM.String())
	metrics.RecordSessionUploadDuration(float64(uploadDev), DEV.String())
	metrics.IncreaseStorageTotalSessions()
}

func (s *Storage) worker() {
	for {
		select {
		case task := <-s.tasks:
			s.uploadSession(task)
		default:
			// Signal that worker finished all tasks
			s.ready <- struct{}{}
		}
	}
}
