package storage

import (
	"bytes"
	"context"
	"fmt"
	"go.opentelemetry.io/otel/metric/instrument/syncfloat64"
	"log"
	config "openreplay/backend/internal/config/storage"
	"openreplay/backend/pkg/flakeid"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/monitoring"
	"openreplay/backend/pkg/storage"
	"os"
	"strconv"
	"time"
)

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
	return &Storage{
		cfg:                 cfg,
		s3:                  s3,
		startBytes:          make([]byte, cfg.FileSplitSize),
		totalSessions:       totalSessions,
		sessionDOMSize:      sessionDOMSize,
		sessionDevtoolsSize: sessionDevtoolsSize,
		readingTime:         readingTime,
		archivingTime:       archivingTime,
	}, nil
}

func (s *Storage) UploadSessionFiles(msg *messages.SessionEnd) error {
	sessionDir := strconv.FormatUint(msg.SessionID(), 10)
	if err := s.uploadKey(msg.SessionID(), sessionDir+"/dom.mob", true, 5, msg.EncryptionKey); err != nil {
		return err
	}
	if err := s.uploadKey(msg.SessionID(), sessionDir+"/devtools.mob", false, 4, msg.EncryptionKey); err != nil {
		return err
	}
	return nil
}

// TODO: make a bit cleaner
func (s *Storage) uploadKey(sessID uint64, key string, shouldSplit bool, retryCount int, encryptionKey string) error {
	if retryCount <= 0 {
		return nil
	}

	start := time.Now()
	file, err := os.Open(s.cfg.FSDir + "/" + key)
	if err != nil {
		return fmt.Errorf("File open error: %v; sessID: %s, part: %d, sessStart: %s\n",
			err, key, sessID%16,
			time.UnixMilli(int64(flakeid.ExtractTimestamp(sessID))),
		)
	}
	defer file.Close()

	var fileSize int64 = 0
	fileInfo, err := file.Stat()
	if err != nil {
		log.Printf("can't get file info: %s", err)
	} else {
		fileSize = fileInfo.Size()
	}
	var encryptedData []byte
	if shouldSplit {
		nRead, err := file.Read(s.startBytes)
		if err != nil {
			log.Printf("File read error: %s; sessID: %s, part: %d, sessStart: %s",
				err,
				key,
				sessID%16,
				time.UnixMilli(int64(flakeid.ExtractTimestamp(sessID))),
			)
			time.AfterFunc(s.cfg.RetryTimeout, func() {
				s.uploadKey(sessID, key, shouldSplit, retryCount-1, encryptionKey)
			})
			return nil
		}
		s.readingTime.Record(context.Background(), float64(time.Now().Sub(start).Milliseconds()))

		start = time.Now()
		// Encrypt session file if we have encryption key
		if encryptionKey != "" {
			encryptedData, err = EncryptData(s.startBytes[:nRead], []byte(encryptionKey))
			if err != nil {
				log.Printf("can't encrypt data: %s", err)
				encryptedData = s.startBytes[:nRead]
			}
		} else {
			encryptedData = s.startBytes[:nRead]
		}
		// Compress and save to s3
		startReader := bytes.NewBuffer(encryptedData)
		if err := s.s3.Upload(s.gzipFile(startReader), key+"s", "application/octet-stream", true); err != nil {
			log.Fatalf("Storage: start upload failed.  %v\n", err)
		}
		// TODO: fix possible error (if we read less then FileSplitSize)
		if nRead == s.cfg.FileSplitSize {
			restPartSize := fileSize - int64(nRead)
			fileData := make([]byte, restPartSize)
			nRead, err = file.Read(fileData)
			if err != nil {
				log.Printf("File read error: %s; sessID: %s, part: %d, sessStart: %s",
					err,
					key,
					sessID%16,
					time.UnixMilli(int64(flakeid.ExtractTimestamp(sessID))),
				)
				return nil
			}
			if int64(nRead) != restPartSize {
				log.Printf("can't read the rest part of file")
			}

			// Encrypt session file if we have encryption key
			if encryptionKey != "" {
				encryptedData, err = EncryptData(fileData, []byte(encryptionKey))
				if err != nil {
					log.Printf("can't encrypt data: %s", err)
					encryptedData = fileData
				}
			} else {
				encryptedData = fileData
			}
			// Compress and save to s3
			endReader := bytes.NewBuffer(encryptedData)
			if err := s.s3.Upload(s.gzipFile(endReader), key+"e", "application/octet-stream", true); err != nil {
				log.Fatalf("Storage: end upload failed. %v\n", err)
			}
		}
		s.archivingTime.Record(context.Background(), float64(time.Now().Sub(start).Milliseconds()))
	} else {
		start = time.Now()
		fileData := make([]byte, fileSize)
		nRead, err := file.Read(fileData)
		if err != nil {
			log.Printf("File read error: %s; sessID: %s, part: %d, sessStart: %s",
				err,
				key,
				sessID%16,
				time.UnixMilli(int64(flakeid.ExtractTimestamp(sessID))),
			)
			return nil
		}
		if int64(nRead) != fileSize {
			log.Printf("can't read the rest part of file")
		}

		// Encrypt session file if we have encryption key
		if encryptionKey != "" {
			encryptedData, err = EncryptData(fileData, []byte(encryptionKey))
			if err != nil {
				log.Printf("can't encrypt data: %s", err)
				encryptedData = fileData
			}
		} else {
			encryptedData = fileData
		}
		endReader := bytes.NewBuffer(encryptedData)
		if err := s.s3.Upload(s.gzipFile(endReader), key+"s", "application/octet-stream", true); err != nil {
			log.Fatalf("Storage: end upload failed. %v\n", err)
		}
		s.archivingTime.Record(context.Background(), float64(time.Now().Sub(start).Milliseconds()))
	}

	// Save metrics
	ctx, _ := context.WithTimeout(context.Background(), time.Millisecond*200)
	if shouldSplit {
		s.totalSessions.Add(ctx, 1)
		s.sessionDOMSize.Record(ctx, float64(fileSize))
	} else {
		s.sessionDevtoolsSize.Record(ctx, float64(fileSize))
	}

	return nil
}
