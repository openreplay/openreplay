package storage

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/andybalholm/brotli"
	"github.com/klauspost/compress/zstd"
	gzip "github.com/klauspost/pgzip"

	config "openreplay/backend/internal/config/storage"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/messages"
	storageMetrics "openreplay/backend/pkg/metrics/storage"
	"openreplay/backend/pkg/objectstorage"
	"openreplay/backend/pkg/pool"
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
	ctx         context.Context
	id          string
	key         string
	domRaw      []byte
	devRaw      []byte
	index       int
	domsRawSize float64
	domeRawSize float64
	devRawSize  float64
	doms        *bytes.Buffer
	dome        *bytes.Buffer
	dev         *bytes.Buffer
	compression objectstorage.CompressionType
}

func (t *Task) SetMob(mob []byte, index int, tp FileType) {
	t.index = index
	if tp == DOM {
		t.domRaw = mob
	} else {
		t.devRaw = mob
	}
}

func (t *Task) Mob(tp FileType) ([]byte, int) {
	if tp == DOM {
		return t.domRaw, t.index
	}
	return t.devRaw, -1
}

type Storage struct {
	cfg           *config.Config
	log           logger.Logger
	objStorage    objectstorage.ObjectStorage
	startBytes    []byte
	splitTime     uint64
	processorPool pool.WorkerPool
	uploaderPool  pool.WorkerPool
	metrics       storageMetrics.Storage
}

func New(cfg *config.Config, log logger.Logger, objStorage objectstorage.ObjectStorage, metrics storageMetrics.Storage) (*Storage, error) {
	switch {
	case cfg == nil:
		return nil, fmt.Errorf("config is empty")
	case objStorage == nil:
		return nil, fmt.Errorf("object storage is empty")
	}
	s := &Storage{
		cfg:        cfg,
		log:        log,
		objStorage: objStorage,
		startBytes: make([]byte, cfg.FileSplitSize),
		splitTime:  parseSplitTime(cfg.FileSplitTime),
		metrics:    metrics,
	}
	s.processorPool = pool.NewPool(1, 1, s.doCompression)
	s.uploaderPool = pool.NewPool(1, 1, s.uploadSession)
	return s, nil
}

func parseSplitTime(splitTime time.Duration) uint64 {
	dur := splitTime.Milliseconds()
	if dur < 0 {
		return 0
	}
	return uint64(dur)
}

func (s *Storage) Wait() {
	s.processorPool.Pause()
	s.uploaderPool.Pause()
}

func (s *Storage) Process(ctx context.Context, msg *messages.SessionEnd) (err error) {
	// Generate file path
	sessionID := strconv.FormatUint(msg.SessionID(), 10)
	filePath := s.cfg.FSDir + "/" + sessionID

	// Prepare sessions
	newTask := &Task{
		ctx:         ctx,
		id:          sessionID,
		key:         msg.EncryptionKey,
		compression: s.setTaskCompression(ctx),
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
			s.log.Warn(ctx, "can't process session: %s", err)
			s.metrics.IncreaseStorageTotalSkippedSessions()
			return nil
		}
		return err
	}

	s.processorPool.Submit(newTask)
	return nil
}

func (s *Storage) prepareSession(path string, tp FileType, task *Task) error {
	// Open session file
	startRead := time.Now()
	mob, index, err := s.openSession(task.ctx, path, tp)
	if err != nil {
		return err
	}

	s.metrics.RecordSessionReadDuration(float64(time.Now().Sub(startRead).Milliseconds()), tp.String())
	s.metrics.RecordSessionSize(float64(len(mob)), tp.String())

	// Put opened session file into task struct
	task.SetMob(mob, index, tp)
	return nil
}

func (s *Storage) openSession(ctx context.Context, filePath string, tp FileType) ([]byte, int, error) {
	if tp == DEV {
		filePath += "devtools"
	}
	// Check file size before download into memory
	info, err := os.Stat(filePath)
	if err == nil && info.Size() > s.cfg.MaxFileSize {
		s.metrics.RecordSkippedSessionSize(float64(info.Size()), tp.String())
		return nil, -1, fmt.Errorf("big file, size: %d", info.Size())
	}
	// Read file into memory
	raw, err := os.ReadFile(filePath)
	if err != nil {
		return nil, -1, err
	}
	if !s.cfg.UseSort {
		return raw, -1, nil
	}
	start := time.Now()
	mob, index, err := s.sortSessionMessages(ctx, tp, raw)
	if err != nil {
		return nil, -1, fmt.Errorf("can't sort session, err: %s", err)
	}
	s.metrics.RecordSessionSortDuration(float64(time.Now().Sub(start).Milliseconds()), tp.String())
	return mob, index, nil
}

func (s *Storage) sortSessionMessages(ctx context.Context, tp FileType, raw []byte) ([]byte, int, error) {
	// Parse messages, sort by index and save result into slice of bytes
	unsortedMessages, err := messages.SplitMessages(raw)
	if err != nil {
		if err.Error() == "session has duplicate messages" {
			s.log.Warn(ctx, err.Error())
		} else {
			s.log.Error(ctx, "can't split session messages: %s", err)
			return raw, -1, nil
		}
	}
	mob, index := messages.MergeMessages(raw, messages.SortMessages(unsortedMessages), tp == DOM, s.splitTime)
	return mob, index, nil
}

func (s *Storage) setTaskCompression(ctx context.Context) objectstorage.CompressionType {
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
		s.log.Warn(ctx, "unknown compression algorithm: %s", s.cfg.CompressionAlgo)
		return objectstorage.NoCompression
	}
}

func (s *Storage) packSession(task *Task, tp FileType) {
	// Prepare mob file
	mob, index := task.Mob(tp)

	// For devtools of short sessions
	if tp == DEV || index == -1 {
		// Compression
		start := time.Now()
		data := s.compress(task.ctx, mob, task.compression)
		s.metrics.RecordSessionCompressDuration(float64(time.Now().Sub(start).Milliseconds()), tp.String())

		// Encryption
		start = time.Now()
		result := s.encryptSession(task.ctx, data.Bytes(), task.key)
		s.metrics.RecordSessionEncryptionDuration(float64(time.Now().Sub(start).Milliseconds()), tp.String())

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
		data := s.compress(task.ctx, mob[:index], task.compression)
		firstPart = time.Since(start).Milliseconds()

		// Encryption
		start = time.Now()
		task.doms = bytes.NewBuffer(s.encryptSession(task.ctx, data.Bytes(), task.key))
		firstEncrypt = time.Since(start).Milliseconds()

		// Record dom start raw size
		task.domsRawSize = float64(index)

		// Finish task
		wg.Done()
	}()

	// DomEnd part
	go func() {
		// Compression
		start := time.Now()
		data := s.compress(task.ctx, mob[index:], task.compression)
		secondPart = time.Since(start).Milliseconds()

		// Encryption
		start = time.Now()
		task.dome = bytes.NewBuffer(s.encryptSession(task.ctx, data.Bytes(), task.key))
		secondEncrypt = time.Since(start).Milliseconds()

		// Record dom end raw size
		task.domeRawSize = float64(len(mob) - index)

		// Finish task
		wg.Done()
	}()
	wg.Wait()

	// Record metrics
	s.metrics.RecordSessionEncryptionDuration(float64(firstEncrypt+secondEncrypt), tp.String())
	s.metrics.RecordSessionCompressDuration(float64(firstPart+secondPart), tp.String())
}

func (s *Storage) encryptSession(ctx context.Context, data []byte, encryptionKey string) []byte {
	if encryptionKey == "" {
		// no encryption, just return the same data
		return data
	}
	encryptedData, err := EncryptData(data, []byte(encryptionKey))
	if err != nil {
		s.log.Error(ctx, "can't encrypt data: %s", err)
		encryptedData = data
	}
	return encryptedData
}

func (s *Storage) compress(ctx context.Context, data []byte, compressionType objectstorage.CompressionType) *bytes.Buffer {
	switch compressionType {
	case objectstorage.Gzip:
		return s.compressGzip(ctx, data)
	case objectstorage.Brotli:
		return s.compressBrotli(ctx, data)
	case objectstorage.Zstd:
		return s.compressZstd(ctx, data)
	default:
		// no compression, just return the same data
		return bytes.NewBuffer(data)
	}
}

func (s *Storage) compressGzip(ctx context.Context, data []byte) *bytes.Buffer {
	zippedMob := new(bytes.Buffer)
	z, _ := gzip.NewWriterLevel(zippedMob, gzip.DefaultCompression)
	if _, err := z.Write(data); err != nil {
		s.log.Error(ctx, "can't write session data to compressor: %s", err)
	}
	if err := z.Close(); err != nil {
		s.log.Error(ctx, "can't close compressor: %s", err)
	}
	return zippedMob
}

func (s *Storage) compressBrotli(ctx context.Context, data []byte) *bytes.Buffer {
	out := bytes.Buffer{}
	writer := brotli.NewWriterOptions(&out, brotli.WriterOptions{Quality: brotli.DefaultCompression})
	in := bytes.NewReader(data)
	n, err := io.Copy(writer, in)
	if err != nil {
		s.log.Error(ctx, "can't write session data to compressor: %s", err)
	}

	if int(n) != len(data) {
		s.log.Error(ctx, "wrote less data than expected: %d vs %d", n, len(data))
	}

	if err := writer.Close(); err != nil {
		s.log.Error(ctx, "can't close compressor: %s", err)
	}
	return &out
}

func (s *Storage) compressZstd(ctx context.Context, data []byte) *bytes.Buffer {
	var out bytes.Buffer
	w, _ := zstd.NewWriter(&out)
	if _, err := w.Write(data); err != nil {
		s.log.Error(ctx, "can't write session data to compressor: %s", err)
	}
	if err := w.Close(); err != nil {
		s.log.Error(ctx, "can't close compressor: %s", err)
	}
	return &out
}

func (s *Storage) uploadSession(payload interface{}) {
	task := payload.(*Task)
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
			s.metrics.RecordSessionCompressionRatio(task.domsRawSize/float64(task.doms.Len()), DOM.String())
			// Upload session to s3
			start := time.Now()
			if err := s.objStorage.Upload(task.doms, task.id+string(DOM)+"s", "application/octet-stream", objectstorage.NoContentEncoding, task.compression); err != nil {
				s.log.Fatal(task.ctx, "failed to upload mob file, err: %s", err)
			}
			uploadDoms = time.Now().Sub(start).Milliseconds()
		}
		wg.Done()
	}()
	go func() {
		if task.dome != nil {
			// Record compression ratio
			s.metrics.RecordSessionCompressionRatio(task.domeRawSize/float64(task.dome.Len()), DOM.String())
			// Upload session to s3
			start := time.Now()
			if err := s.objStorage.Upload(task.dome, task.id+string(DOM)+"e", "application/octet-stream", objectstorage.NoContentEncoding, task.compression); err != nil {
				s.log.Fatal(task.ctx, "failed to upload mob file, err: %s", err)
			}
			uploadDome = time.Now().Sub(start).Milliseconds()
		}
		wg.Done()
	}()
	go func() {
		if task.dev != nil {
			// Record compression ratio
			s.metrics.RecordSessionCompressionRatio(task.devRawSize/float64(task.dev.Len()), DEV.String())
			// Upload session to s3
			start := time.Now()
			if err := s.objStorage.Upload(task.dev, task.id+string(DEV), "application/octet-stream", objectstorage.NoContentEncoding, task.compression); err != nil {
				s.log.Fatal(task.ctx, "failed to upload mob file, err: %s", err)
			}
			uploadDev = time.Now().Sub(start).Milliseconds()
		}
		wg.Done()
	}()
	wg.Wait()
	s.metrics.RecordSessionUploadDuration(float64(uploadDoms+uploadDome), DOM.String())
	s.metrics.RecordSessionUploadDuration(float64(uploadDev), DEV.String())
	s.metrics.IncreaseStorageTotalSessions()
}

func (s *Storage) doCompression(payload interface{}) {
	task := payload.(*Task)
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
	s.uploaderPool.Submit(task)
}
