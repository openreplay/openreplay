package storage

import (
	"bytes"
	"context"
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
	"time"
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

	totalSessions    syncfloat64.Counter
	sessionDOMSize   syncfloat64.Histogram
	sessionDEVSize   syncfloat64.Histogram
	readingDOMTime   syncfloat64.Histogram
	readingDEVTime   syncfloat64.Histogram
	archivingDOMTime syncfloat64.Histogram
	archivingDEVTime syncfloat64.Histogram
	uploadingDOMTime syncfloat64.Histogram
	uploadingDEVTime syncfloat64.Histogram

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
	readingDOMTime, err := metrics.RegisterHistogram("reading_duration")
	if err != nil {
		log.Printf("can't create reading_duration metric: %s", err)
	}
	readingDEVTime, err := metrics.RegisterHistogram("reading_dt_duration")
	if err != nil {
		log.Printf("can't create reading_duration metric: %s", err)
	}
	archivingDOMTime, err := metrics.RegisterHistogram("archiving_duration")
	if err != nil {
		log.Printf("can't create archiving_duration metric: %s", err)
	}
	archivingDEVTime, err := metrics.RegisterHistogram("archiving_dt_duration")
	if err != nil {
		log.Printf("can't create archiving_duration metric: %s", err)
	}
	uploadingDOMTime, err := metrics.RegisterHistogram("uploading_duration")
	if err != nil {
		log.Printf("can't create uploading_duration metric: %s", err)
	}
	uploadingDEVTime, err := metrics.RegisterHistogram("uploading_dt_duration")
	if err != nil {
		log.Printf("can't create uploading_duration metric: %s", err)
	}
	newStorage := &Storage{
		cfg:              cfg,
		s3:               s3,
		startBytes:       make([]byte, cfg.FileSplitSize),
		totalSessions:    totalSessions,
		sessionDOMSize:   sessionDOMSize,
		sessionDEVSize:   sessionDevtoolsSize,
		readingDOMTime:   readingDOMTime,
		readingDEVTime:   readingDEVTime,
		archivingDOMTime: archivingDOMTime,
		archivingDEVTime: archivingDEVTime,
		uploadingDOMTime: uploadingDOMTime,
		uploadingDEVTime: uploadingDEVTime,
		tasks:            make(chan *Task, 1),
		ready:            make(chan struct{}),
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

func (s *Storage) openSession(filePath string) ([]byte, error) {
	// Get file name
	sessID := "unknown"
	parts := strings.Split(filePath, "/")
	if len(parts) > 0 {
		sessID = parts[len(parts)-1]
	}
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
	return s.sortSessionMessages(sessID, raw)
}

func (s *Storage) sortSessionMessages(sessID string, raw []byte) ([]byte, error) {
	// Parse messages, sort by index and save result into slice of bytes
	start := time.Now()
	unsortedMessages, err := messages.SplitMessages(raw)
	if err != nil {
		log.Printf("can't sort session, err: %s", err)
		return raw, nil
	}
	sortedMessages, wasSorted := messages.SortMessages(unsortedMessages)
	if !wasSorted {
		// Can skip merge operation
		return raw, nil
	}
	sortedSession := messages.MergeMessages(raw, sortedMessages)
	log.Printf("sorted session: %s, dur: %d", sessID, time.Now().Sub(start).Milliseconds())
	return sortedSession, nil
}

func (s *Storage) prepareSession(path string, tp FileType, task *Task) error {
	// Open mob file
	if tp == DEV {
		path += "devtools"
	}
	startRead := time.Now()
	mob, err := s.openSession(path)
	if err != nil {
		return err
	}
	durRead := time.Now().Sub(startRead).Milliseconds()
	// Send metrics
	ctx, _ := context.WithTimeout(context.Background(), time.Millisecond*200)
	if tp == DOM {
		s.sessionDOMSize.Record(ctx, float64(len(mob)))
		s.readingDOMTime.Record(ctx, float64(durRead))
	} else {
		s.sessionDEVSize.Record(ctx, float64(len(mob)))
		s.readingDEVTime.Record(ctx, float64(durRead))
	}
	// Encode and compress session
	if tp == DEV {
		startCompress := time.Now()
		task.dev = s.compressSession(mob)
		s.archivingDEVTime.Record(ctx, float64(time.Now().Sub(startCompress).Milliseconds()))
	} else {
		if len(mob) <= s.cfg.FileSplitSize {
			startCompress := time.Now()
			task.doms = s.compressSession(mob)
			s.archivingDOMTime.Record(ctx, float64(time.Now().Sub(startCompress).Milliseconds()))
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
		s.archivingDOMTime.Record(ctx, float64(firstPart+secondPart))
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
	// Record metrics
	ctx, _ := context.WithTimeout(context.Background(), time.Millisecond*200)
	s.uploadingDOMTime.Record(ctx, float64(uploadDoms+uploadDome))
	s.uploadingDEVTime.Record(ctx, float64(uploadDev))
	s.totalSessions.Add(ctx, 1)
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
