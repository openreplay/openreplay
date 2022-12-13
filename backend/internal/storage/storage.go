package storage

import (
	"bytes"
	"fmt"
	gzip "github.com/klauspost/pgzip"
	"go.opentelemetry.io/otel/metric/instrument/syncfloat64"
	"log"
	config "openreplay/backend/internal/config/storage"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/monitoring"
	"openreplay/backend/pkg/storage"
	"os"
	"strconv"
	"strings"
	"sync"
)

type FileType string

const (
	DOM FileType = "/dom.mob"
	DEV FileType = "/devtools.mob"
)

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

	totalSessions       syncfloat64.Counter
	sessionDOMSize      syncfloat64.Histogram
	sessionDevtoolsSize syncfloat64.Histogram
	readingDOMTime      syncfloat64.Histogram
	readingTime         syncfloat64.Histogram
	archivingTime       syncfloat64.Histogram

	tasks chan *Task
	ready chan struct{}
}

func New(cfg *config.Config, s3 *storage.S3, metrics *monitoring.Metrics) (*Storage, error) {
	switch {
	case cfg == nil:
		return nil, fmt.Errorf("config is empty")
	case s3 == nil:
		return nil, fmt.Errorf("s3 storage is empty")
	}
	// Create metrics
	totalSessions, err := metrics.RegisterCounter("sessions_total")
	if err != nil {
		log.Printf("can't create sessions_total metric: %s", err)
	}
	sessionDOMSize, err := metrics.RegisterHistogram("sessions_size")
	if err != nil {
		log.Printf("can't create session_size metric: %s", err)
	}
	sessionDevtoolsSize, err := metrics.RegisterHistogram("sessions_dt_size")
	if err != nil {
		log.Printf("can't create sessions_dt_size metric: %s", err)
	}
	readingTime, err := metrics.RegisterHistogram("reading_duration")
	if err != nil {
		log.Printf("can't create reading_duration metric: %s", err)
	}
	archivingTime, err := metrics.RegisterHistogram("archiving_duration")
	if err != nil {
		log.Printf("can't create archiving_duration metric: %s", err)
	}
	newStorage := &Storage{
		cfg:                 cfg,
		s3:                  s3,
		startBytes:          make([]byte, cfg.FileSplitSize),
		totalSessions:       totalSessions,
		sessionDOMSize:      sessionDOMSize,
		sessionDevtoolsSize: sessionDevtoolsSize,
		readingTime:         readingTime,
		archivingTime:       archivingTime,
		tasks:               make(chan *Task, 1),
		ready:               make(chan struct{}),
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
			err = fmt.Errorf("prepareSession err: %s", prepErr)
		}
		wg.Done()
	}()
	go func() {
		if prepErr := s.prepareSession(filePath, DEV, newTask); prepErr != nil {
			err = fmt.Errorf("prepareSession err: %s", prepErr)
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

func (s *Storage) openSession(filePath string) ([]byte, error) {
	// Check file size before download into memory
	info, err := os.Stat(filePath)
	if err == nil && info.Size() > s.cfg.MaxFileSize {
		return nil, fmt.Errorf("big file, size: %d", info.Size())
	}
	// Read file into memory
	return os.ReadFile(filePath)
}

func (s *Storage) prepareSession(path string, tp FileType, task *Task) error {
	// Open mob file
	if tp == DEV {
		path += "devtools"
	}
	mob, err := s.openSession(path)
	if err != nil {
		return err
	}
	if tp == DEV {
		task.dev = s.compressSession(mob)
	} else {
		if len(mob) <= s.cfg.FileSplitSize {
			task.doms = s.compressSession(mob)
			return nil
		}
		wg := &sync.WaitGroup{}
		wg.Add(2)
		go func() {
			task.doms = s.compressSession(mob[:s.cfg.FileSplitSize])
			wg.Done()
		}()
		go func() {
			task.dome = s.compressSession(mob[s.cfg.FileSplitSize:])
			wg.Done()
		}()
		wg.Wait()
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
	go func() {
		if task.doms != nil {
			if err := s.s3.Upload(task.doms, task.id+string(DOM)+"s", "application/octet-stream", true); err != nil {
				log.Fatalf("Storage: start upload failed.  %s", err)
			}
		}
		wg.Done()
	}()
	go func() {
		if task.dome != nil {
			if err := s.s3.Upload(task.dome, task.id+string(DOM)+"e", "application/octet-stream", true); err != nil {
				log.Fatalf("Storage: start upload failed.  %s", err)
			}
		}
		wg.Done()
	}()
	go func() {
		if task.dev != nil {
			if err := s.s3.Upload(task.dev, task.id+string(DEV), "application/octet-stream", true); err != nil {
				log.Fatalf("Storage: start upload failed.  %s", err)
			}
		}
		wg.Done()
	}()
	wg.Wait()
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
