package storage

import (
	"bytes"
	"fmt"
	"github.com/andybalholm/brotli"
	"io"
	"log"
	"openreplay/backend/pkg/objectstorage"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/klauspost/compress/zstd"
	gzip "github.com/klauspost/pgzip"
	config "openreplay/backend/internal/config/storage"
	"openreplay/backend/pkg/messages"
	metrics "openreplay/backend/pkg/metrics/storage"
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
	domRaw      []byte
	devRaw      []byte
	domsRawSize float64
	domeRawSize float64
	devRawSize  float64
	doms        *bytes.Buffer
	dome        *bytes.Buffer
	dev         *bytes.Buffer
	isBreakTask bool
	compression objectstorage.CompressionType
}

func (t *Task) SetMob(mob []byte, tp FileType) {
	if tp == DOM {
		t.domRaw = mob
	} else {
		t.devRaw = mob
	}
}

func (t *Task) Mob(tp FileType) []byte {
	if tp == DOM {
		return t.domRaw
	}
	return t.devRaw
}

func NewBreakTask() *Task {
	return &Task{
		isBreakTask: true,
	}
}

type Storage struct {
	cfg              *config.Config
	objStorage       objectstorage.ObjectStorage
	startBytes       []byte
	compressionTasks chan *Task // brotli compression or gzip compression with encryption
	uploadingTasks   chan *Task // upload to s3
	workersStopped   chan struct{}
}

func New(cfg *config.Config, objStorage objectstorage.ObjectStorage) (*Storage, error) {
	switch {
	case cfg == nil:
		return nil, fmt.Errorf("config is empty")
	case objStorage == nil:
		return nil, fmt.Errorf("object storage is empty")
	}
	newStorage := &Storage{
		cfg:              cfg,
		objStorage:       objStorage,
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
		id:          sessionID,
		key:         msg.EncryptionKey,
		compression: s.setTaskCompression(),
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

func (s *Storage) openSession(sessID, filePath string, tp FileType) ([]byte, error) {
	if tp == DEV {
		filePath += "devtools"
	}
	// Check file size before download into memory
	info, err := os.Stat(filePath)
	if err == nil && info.Size() > s.cfg.MaxFileSize {
		metrics.RecordSkippedSessionSize(float64(info.Size()), tp.String())
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
	res, err := s.sortSessionMessages(sessID, raw)
	if err != nil {
		return nil, fmt.Errorf("can't sort session, err: %s", err)
	}
	metrics.RecordSessionSortDuration(float64(time.Now().Sub(start).Milliseconds()), tp.String())
	return res, nil
}

func (s *Storage) sortSessionMessages(sessID string, raw []byte) ([]byte, error) {
	// Parse messages, sort by index and save result into slice of bytes
	unsortedMessages, err := messages.SplitMessages(sessID, raw)
	if err != nil {
		log.Printf("can't sort session, err: %s", err)
		return raw, nil
	}
	return messages.MergeMessages(raw, messages.SortMessages(unsortedMessages)), nil
}

func (s *Storage) prepareSession(path string, tp FileType, task *Task) error {
	// Open session file
	startRead := time.Now()
	mob, err := s.openSession(task.id, path, tp)
	if err != nil {
		return err
	}
	metrics.RecordSessionReadDuration(float64(time.Now().Sub(startRead).Milliseconds()), tp.String())
	metrics.RecordSessionSize(float64(len(mob)), tp.String())

	// Put opened session file into task struct
	task.SetMob(mob, tp)
	return nil
}

func (s *Storage) setTaskCompression() objectstorage.CompressionType {
	switch s.cfg.CompressionAlgo {
	case "none":
		return objectstorage.NoCompression
	case "gzip":
		return objectstorage.Gzip
	case "brotli":
		return objectstorage.Brotli
	case "zstd":
		return objectstorage.Zstd
	default:
		log.Printf("unknown compression algorithm: %s", s.cfg.CompressionAlgo)
		return objectstorage.NoCompression
	}
}

func (s *Storage) packSession(task *Task, tp FileType) {
	// Prepare mob file
	mob := task.Mob(tp)

	// For devtools of small dom file
	if tp == DEV || len(mob) <= s.cfg.FileSplitSize {
		// Compression
		start := time.Now()
		data := s.compress(mob, task.compression)
		metrics.RecordSessionCompressDuration(float64(time.Now().Sub(start).Milliseconds()), tp.String())

		// Encryption
		start = time.Now()
		result := s.encryptSession(data.Bytes(), task.key)
		metrics.RecordSessionEncryptionDuration(float64(time.Now().Sub(start).Milliseconds()), tp.String())

		if tp == DOM {
			task.doms = bytes.NewBuffer(result)
			task.domsRawSize = float64(len(mob))
		} else {
			task.dev = bytes.NewBuffer(result)
			task.devRawSize = float64(len(mob))
		}
		return
	}

	// Prepare two workers for two parts (start and end) of dom file
	wg := &sync.WaitGroup{}
	wg.Add(2)
	var firstPart, secondPart, firstEncrypt, secondEncrypt int64

	// DomStart part
	go func() {
		// Compression
		start := time.Now()
		data := s.compress(mob[:s.cfg.FileSplitSize], task.compression)
		firstPart = time.Since(start).Milliseconds()

		// Encryption
		start = time.Now()
		task.doms = bytes.NewBuffer(s.encryptSession(data.Bytes(), task.key))
		firstEncrypt = time.Since(start).Milliseconds()

		// Record dom start raw size
		task.domsRawSize = float64(s.cfg.FileSplitSize)

		// Finish task
		wg.Done()
	}()

	// DomEnd part
	go func() {
		// Compression
		start := time.Now()
		data := s.compress(mob[s.cfg.FileSplitSize:], task.compression)
		secondPart = time.Since(start).Milliseconds()

		// Encryption
		start = time.Now()
		task.dome = bytes.NewBuffer(s.encryptSession(data.Bytes(), task.key))
		secondEncrypt = time.Since(start).Milliseconds()

		// Record dom end raw size
		task.domeRawSize = float64(len(mob) - s.cfg.FileSplitSize)

		// Finish task
		wg.Done()
	}()
	wg.Wait()

	// Record metrics
	metrics.RecordSessionEncryptionDuration(float64(firstEncrypt+secondEncrypt), tp.String())
	metrics.RecordSessionCompressDuration(float64(firstPart+secondPart), tp.String())
}

func (s *Storage) encryptSession(data []byte, encryptionKey string) []byte {
	if encryptionKey == "" {
		// no encryption, just return the same data
		return data
	}
	encryptedData, err := EncryptData(data, []byte(encryptionKey))
	if err != nil {
		log.Printf("can't encrypt data: %s", err)
		encryptedData = data
	}
	return encryptedData
}

func (s *Storage) compress(data []byte, compressionType objectstorage.CompressionType) *bytes.Buffer {
	switch compressionType {
	case objectstorage.Gzip:
		return s.compressGzip(data)
	case objectstorage.Brotli:
		return s.compressBrotli(data)
	case objectstorage.Zstd:
		return s.compressZstd(data)
	default:
		// no compression, just return the same data
		return bytes.NewBuffer(data)
	}
}

func (s *Storage) compressGzip(data []byte) *bytes.Buffer {
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

func (s *Storage) compressBrotli(data []byte) *bytes.Buffer {
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

func (s *Storage) compressZstd(data []byte) *bytes.Buffer {
	var out bytes.Buffer
	w, _ := zstd.NewWriter(&out)
	if _, err := w.Write(data); err != nil {
		log.Printf("can't write session data to compressor: %s", err)
	}
	if err := w.Close(); err != nil {
		log.Printf("can't close compressor: %s", err)
	}
	return &out
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
			// Record compression ratio
			metrics.RecordSessionCompressionRatio(task.domsRawSize/float64(task.doms.Len()), DOM.String())
			// Upload session to s3
			start := time.Now()
			if err := s.objStorage.Upload(task.doms, task.id+string(DOM)+"s", "application/octet-stream", "", task.compression); err != nil {
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
			if err := s.objStorage.Upload(task.dome, task.id+string(DOM)+"e", "application/octet-stream", "", task.compression); err != nil {
				log.Fatalf("Storage: start upload failed.  %s", err)
			}
			uploadDome = time.Now().Sub(start).Milliseconds()
		}
		wg.Done()
	}()
	go func() {
		if task.dev != nil {
			// Record compression ratio
			metrics.RecordSessionCompressionRatio(task.devRawSize/float64(task.dev.Len()), DEV.String())
			// Upload session to s3
			start := time.Now()
			if err := s.objStorage.Upload(task.dev, task.id+string(DEV), "application/octet-stream", "", task.compression); err != nil {
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
