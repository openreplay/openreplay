package storage

import (
	"bytes"
	"fmt"
	"github.com/andybalholm/brotli"
	"io"
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
	id          string
	key         string
	domsRaw     []byte
	domeRaw     []byte
	devsRaw     []byte
	deveRaw     []byte
	domsRawSize float64
	domeRawSize float64
	devsRawSize float64
	deveRawSize float64
	doms        *bytes.Buffer
	dome        *bytes.Buffer
	devs        *bytes.Buffer
	deve        *bytes.Buffer
	isBreakTask bool
}

func (t *Task) SetMob(mobs, mobe []byte, tp FileType) {
	if tp == DOM {
		t.domsRaw = mobs
		t.domeRaw = mobe
	} else {
		t.devsRaw = mobs
		t.deveRaw = mobe
	}
}

func (t *Task) Mob(tp FileType) ([]byte, []byte) {
	if tp == DOM {
		return t.domsRaw, t.domeRaw
	}
	return t.devsRaw, t.deveRaw
}

func NewBreakTask() *Task {
	return &Task{
		isBreakTask: true,
	}
}

type Storage struct {
	cfg              *config.Config
	s3               *storage.S3
	startBytes       []byte
	compressionTasks chan *Task // brotli compression or gzip compression with encryption
	uploadingTasks   chan *Task // upload to s3
	workersStopped   chan struct{}
}

func New(cfg *config.Config, s3 *storage.S3) (*Storage, error) {
	switch {
	case cfg == nil:
		return nil, fmt.Errorf("config is empty")
	case s3 == nil:
		return nil, fmt.Errorf("s3 storage is empty")
	}
	newStorage := &Storage{
		cfg:              cfg,
		s3:               s3,
		startBytes:       make([]byte, cfg.FileSplitSize),
		compressionTasks: make(chan *Task, 1),
		uploadingTasks:   make(chan *Task, 1),
		workersStopped:   make(chan struct{}),
	}
	go newStorage.compressionWorker()
	go newStorage.uploadingWorker()
	return newStorage, nil
}

func (s *Storage) Wait() {
	// Send stop signal to the first worker
	s.compressionTasks <- NewBreakTask()
	// Wait stopped signal from the last workers
	<-s.workersStopped
}

func (s *Storage) Process(msg *messages.SessionEnd) (err error) {
	// Generate file path
	sessionID := strconv.FormatUint(msg.SessionID(), 10)
	filePath := s.cfg.FSDir + "/" + sessionID

	// Prepare sessions
	newTask := &Task{
		id:  sessionID,
		key: msg.EncryptionKey,
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
			metrics.IncreaseStorageTotalSkippedSessions()
			return nil
		}
		return err
	}

	// Send new task to compression worker
	s.compressionTasks <- newTask
	return nil
}

func (s *Storage) openSession(sessID, filePath string, tp FileType) ([]byte, []byte, error) {
	if tp == DEV {
		filePath += "devtools"
	}
	// Check file size before download into memory
	info, err := os.Stat(filePath)
	if err == nil && info.Size() > s.cfg.MaxFileSize {
		metrics.RecordSkippedSessionSize(float64(info.Size()), tp.String())
		return nil, nil, fmt.Errorf("big file, size: %d", info.Size())
	}
	// Read file into memory
	raw, err := os.ReadFile(filePath)
	if err != nil {
		return nil, nil, err
	}
	if !s.cfg.UseSort {
		return raw, nil, nil
	}
	start := time.Now()
	first, second, err := s.sortSessionMessages(sessID, raw, tp)
	if err != nil {
		return nil, nil, fmt.Errorf("can't sort session, err: %s", err)
	}
	metrics.RecordSessionSortDuration(float64(time.Now().Sub(start).Milliseconds()), tp.String())
	return first, second, nil
}

func (s *Storage) sortSessionMessages(sessID string, raw []byte, tp FileType) ([]byte, []byte, error) {
	// Parse messages, sort by index and save result into slice of bytes
	unsortedMessages, err := messages.SplitMessages(sessID, raw)
	if err != nil {
		log.Printf("can't sort session, err: %s", err)
		return raw, nil, nil
	}
	sortedMessages := messages.SortMessages(unsortedMessages)
	splittingPivot := messages.SplitByDuration(sortedMessages, uint64(s.cfg.FileSplitDuration.Seconds()))
	if tp == DOM {
		messages.DOMRatio(sessID, sortedMessages)
	}
	if splittingPivot == 0 || tp == DEV {
		return messages.MergeMessages(raw, sortedMessages), nil, nil
	}
	return messages.MergeMessages(raw, sortedMessages[:splittingPivot]),
		messages.MergeMessages(raw, sortedMessages[splittingPivot:]), nil
}

func (s *Storage) prepareSession(path string, tp FileType, task *Task) error {
	// Open session file
	startRead := time.Now()
	mobs, mobe, err := s.openSession(task.id, path, tp)
	if err != nil {
		return err
	}
	metrics.RecordSessionReadDuration(float64(time.Now().Sub(startRead).Milliseconds()), tp.String())
	metrics.RecordSessionSize(float64(len(mobs)+len(mobe)), tp.String())

	// Put opened session file into task struct
	task.SetMob(mobs, mobe, tp)
	return nil
}

func (s *Storage) packSession(task *Task, tp FileType) {
	// If encryption key is empty, pack session using better algorithm
	if task.key == "" {
		s.packSessionBetter(task, tp)
		return
	}

	// Prepare mob file
	mobs, mobe := task.Mob(tp)

	// Prepare two workers
	wg := &sync.WaitGroup{}
	wg.Add(2)
	var firstPart, secondPart, firstEncrypt, secondEncrypt int64

	go func() {
		// Skip if mob is empty
		if mobs == nil {
			wg.Done()
			return
		}

		// Compression
		start := time.Now()
		data := s.compressSession(mobs)
		firstPart = time.Since(start).Milliseconds()

		// Encryption
		start = time.Now()
		result := bytes.NewBuffer(s.encryptSession(data.Bytes(), task.key))
		firstEncrypt = time.Since(start).Milliseconds()

		if tp == DOM {
			task.doms = result
		} else {
			task.devs = result
		}

		// Finish task
		wg.Done()
	}()

	go func() {
		// Skip if mob is empty
		if mobe == nil {
			wg.Done()
			return
		}

		// Compression
		start := time.Now()
		data := s.compressSession(mobe)
		secondPart = time.Since(start).Milliseconds()

		// Encryption
		start = time.Now()
		result := bytes.NewBuffer(s.encryptSession(data.Bytes(), task.key))
		secondEncrypt = time.Since(start).Milliseconds()

		if tp == DOM {
			task.dome = result
		} else {
			task.deve = result
		}

		// Finish task
		wg.Done()
	}()
	wg.Wait()

	// Record metrics
	metrics.RecordSessionEncryptionDuration(float64(firstEncrypt+secondEncrypt), tp.String())
	metrics.RecordSessionCompressDuration(float64(firstPart+secondPart), tp.String())
}

// packSessionBetter is a new version of packSession that uses brotli compression (only if we are not using encryption)
func (s *Storage) packSessionBetter(task *Task, tp FileType) {
	// Prepare mob file
	mobs, mobe := task.Mob(tp)

	// Prepare two workers
	wg := &sync.WaitGroup{}
	wg.Add(2)
	var firstPart, secondPart, firstEncrypt, secondEncrypt int64

	// DomStart part
	go func() {
		// Skip if mob is empty
		if mobs == nil {
			wg.Done()
			return
		}

		// Compression
		start := time.Now()
		result := s.compressSessionBetter(mobs)
		firstPart = time.Since(start).Milliseconds()

		// Record dom start raw size
		if tp == DOM {
			task.doms = result
			task.domsRawSize = float64(len(mobs))
		} else {
			task.devs = result
			task.devsRawSize = float64(len(mobs))
		}

		// Finish task
		wg.Done()
	}()
	// DomEnd part
	go func() {
		// Skip if mob is empty
		if mobs == nil {
			wg.Done()
			return
		}

		// Compression
		start := time.Now()
		result := s.compressSessionBetter(mobe)
		secondPart = time.Since(start).Milliseconds()

		// Record dom end raw size
		if tp == DOM {
			task.dome = result
			task.domeRawSize = float64(len(mobe))
		} else {
			task.deve = result
			task.deveRawSize = float64(len(mobe))
		}

		// Finish task
		wg.Done()
	}()
	wg.Wait()

	// Record metrics
	metrics.RecordSessionEncryptionDuration(float64(firstEncrypt+secondEncrypt), tp.String())
	metrics.RecordSessionCompressDuration(float64(firstPart+secondPart), tp.String())
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
	z, _ := gzip.NewWriterLevel(zippedMob, gzip.DefaultCompression)
	if _, err := z.Write(data); err != nil {
		log.Printf("can't write session data to compressor: %s", err)
	}
	if err := z.Close(); err != nil {
		log.Printf("can't close compressor: %s", err)
	}
	return zippedMob
}

func (s *Storage) compressSessionBetter(data []byte) *bytes.Buffer {
	out := bytes.Buffer{}
	writer := brotli.NewWriterOptions(&out, brotli.WriterOptions{Quality: brotli.DefaultCompression})
	in := bytes.NewReader(data)
	n, err := io.Copy(writer, in)
	if err != nil {
		log.Printf("can't write session data to compressor: %s", err)
	}

	if int(n) != len(data) {
		log.Printf("wrote less data than expected: %d vs %d", n, len(data))
	}

	if err := writer.Close(); err != nil {
		log.Printf("can't close compressor: %s", err)
	}
	return &out
}

func (s *Storage) uploadSession(task *Task) {
	wg := &sync.WaitGroup{}
	wg.Add(3) // doms, dome, dev
	var (
		uploadDoms int64 = 0
		uploadDome int64 = 0
		uploadDev  int64 = 0
	)
	compression := storage.NoCompression
	if task.key == "" {
		compression = storage.Brotli
	}
	go func() {
		if task.doms != nil {
			// Record compression ratio
			metrics.RecordSessionCompressionRatio(task.domsRawSize/float64(task.doms.Len()), DOM.String())
			// Upload session to s3
			start := time.Now()
			if err := s.s3.Upload(task.doms, task.id+string(DOM)+"s", "application/octet-stream", compression); err != nil {
				log.Fatalf("Storage: start upload failed.  %s", err)
			}
			uploadDoms = time.Now().Sub(start).Milliseconds()
		}
		wg.Done()
	}()
	go func() {
		if task.dome != nil {
			// Record compression ratio
			metrics.RecordSessionCompressionRatio(task.domeRawSize/float64(task.dome.Len()), DOM.String())
			// Upload session to s3
			start := time.Now()
			if err := s.s3.Upload(task.dome, task.id+string(DOM)+"e", "application/octet-stream", compression); err != nil {
				log.Fatalf("Storage: start upload failed.  %s", err)
			}
			uploadDome = time.Now().Sub(start).Milliseconds()
		}
		wg.Done()
	}()
	go func() {
		if task.devs != nil {
			// Record compression ratio
			metrics.RecordSessionCompressionRatio(task.devsRawSize/float64(task.devs.Len()), DEV.String())
			// Upload session to s3
			start := time.Now()
			if err := s.s3.Upload(task.devs, task.id+string(DEV), "application/octet-stream", compression); err != nil {
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

func (s *Storage) doCompression(task *Task) {
	wg := &sync.WaitGroup{}
	wg.Add(2)
	go func() {
		s.packSession(task, DOM)
		wg.Done()
	}()
	go func() {
		s.packSession(task, DEV)
		wg.Done()
	}()
	wg.Wait()
	s.uploadingTasks <- task
}

func (s *Storage) compressionWorker() {
	for {
		select {
		case task := <-s.compressionTasks:
			if task.isBreakTask {
				s.uploadingTasks <- task
				continue
			}
			s.doCompression(task)
		}
	}
}

func (s *Storage) uploadingWorker() {
	for {
		select {
		case task := <-s.uploadingTasks:
			if task.isBreakTask {
				s.workersStopped <- struct{}{}
				continue
			}
			s.uploadSession(task)
		}
	}
}
