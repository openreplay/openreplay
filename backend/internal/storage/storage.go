package storage

import (
	"bytes"
	"fmt"
	"log"
	config "openreplay/backend/internal/config/storage"
	"openreplay/backend/pkg/storage"
	"os"
	"time"
)

type Storage struct {
	cfg        *config.Config
	s3         *storage.S3
	startBytes []byte
}

func New(cfg *config.Config, s3 *storage.S3) (*Storage, error) {
	switch {
	case cfg == nil:
		return nil, fmt.Errorf("config is empty")
	case s3 == nil:
		return nil, fmt.Errorf("s3 storage is empty")
	}
	return &Storage{
		cfg:        cfg,
		s3:         s3,
		startBytes: make([]byte, cfg.FileSplitSize),
	}, nil
}

func (s *Storage) UploadKey(key string, retryCount int) {
	if retryCount <= 0 {
		return
	}

	file, err := os.Open(s.cfg.FSDir + "/" + key)
	if err != nil {
		log.Printf("File error: %v; Will retry %v more time(s); sessID: %s\n", err, retryCount, key)
		time.AfterFunc(s.cfg.RetryTimeout, func() {
			s.UploadKey(key, retryCount-1)
		})
		return
	}
	defer file.Close()

	nRead, err := file.Read(s.startBytes)
	if err != nil {
		log.Printf("File read error: %s; sessID: %s", err, key)
		return
	}
	startReader := bytes.NewBuffer(s.startBytes[:nRead])
	if err := s.s3.Upload(s.gzipFile(startReader), key, "application/octet-stream", true); err != nil {
		log.Fatalf("Storage: start upload failed.  %v\n", err)
	}
	if nRead == s.cfg.FileSplitSize {
		if err := s.s3.Upload(s.gzipFile(file), key+"e", "application/octet-stream", true); err != nil {
			log.Fatalf("Storage: end upload failed. %v\n", err)
		}
	}
}
