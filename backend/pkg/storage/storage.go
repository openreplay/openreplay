package storage

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	config "openreplay/backend/internal/config/storage"
	"openreplay/backend/pkg/logger"
	storageMetrics "openreplay/backend/pkg/metrics/storage"
	"openreplay/backend/pkg/objectstorage"
	"openreplay/backend/pkg/pool"

	"github.com/klauspost/compress/zstd"
)

type Uploader interface {
	Upload(ctx context.Context, sessionID uint64, encryptionKey string) error
	Clean(ctx context.Context, sessionID uint64) error
	Wait()
}

type uploadTask struct {
	ctx            context.Context
	sessionID      uint64
	encryptionKey  string
	saveMobeAsMobs bool
}

type uploaderImpl struct {
	cfg          *config.Config
	log          logger.Logger
	objStorage   objectstorage.ObjectStorage
	uploaderPool pool.WorkerPool
	metrics      storageMetrics.Storage
}

func New(cfg *config.Config, log logger.Logger, objStorage objectstorage.ObjectStorage, metrics storageMetrics.Storage) (Uploader, error) {
	switch {
	case cfg == nil:
		return nil, fmt.Errorf("config is empty")
	case objStorage == nil:
		return nil, fmt.Errorf("object storage is empty")
	}
	s := &uploaderImpl{
		cfg:        cfg,
		log:        log,
		objStorage: objStorage,
		metrics:    metrics,
	}
	s.uploaderPool = pool.NewPool(cfg.NumberOfWorkers, cfg.NumberOfWorkers, s.uploadSession)
	return s, nil
}

var ErrSessionNotFound = errors.New("session files not found locally")
var ErrSessionWithoutFirstPart = errors.New("no mobs file")

func (u *uploaderImpl) Upload(ctx context.Context, sessionID uint64, encryptionKey string) error {
	filePath := u.cfg.FSDir + "/" + strconv.FormatUint(sessionID, 10)
	saveMobeAsMobs := false
	if err := checkMobFilePresence(filePath); err != nil {
		if !errors.Is(err, ErrSessionWithoutFirstPart) {
			return err
		}
		saveMobeAsMobs = true
		u.log.Warn(ctx, "session without first part: %d", sessionID)
	}
	u.uploaderPool.Submit(&uploadTask{
		ctx:            ctx,
		sessionID:      sessionID,
		encryptionKey:  encryptionKey,
		saveMobeAsMobs: saveMobeAsMobs,
	})
	return nil
}

func checkMobFilePresence(filePath string) error {
	if _, err := os.Stat(filePath + "s"); err == nil {
		return nil
	} else if !os.IsNotExist(err) {
		return err
	}
	if _, err := os.Stat(filePath); err == nil {
		return nil
	} else if !os.IsNotExist(err) {
		return err
	}
	// Hack: we'll use sid(e) file as a single dom file
	if _, err := os.Stat(filePath + "e"); err == nil {
		return ErrSessionWithoutFirstPart
	}
	return ErrSessionNotFound
}

const (
	DOM string = "/dom.mob"
	DEV string = "/devtools.mob"
)

func IsNotExist(err error) bool {
	return strings.Contains(err.Error(), "no such file or directory")
}

func (u *uploaderImpl) uploadSession(payload interface{}) {
	task := payload.(*uploadTask)
	ctx := task.ctx
	sid := strconv.FormatUint(task.sessionID, 10)
	filePath := u.cfg.FSDir + "/" + sid

	uploadFn := func(name, srcPath, fileType string) error {
		if info, statErr := os.Stat(srcPath); statErr == nil {
			u.metrics.RecordSessionSize(float64(info.Size()), fileType)
		}
		start := time.Now()
		mode := "compress"
		var err error
		if task.encryptionKey != "" {
			mode = "encrypt"
			err = u.streamEncryptionToS3(name, task.encryptionKey, srcPath)
		} else {
			err = u.streamZstdToS3(name, srcPath)
		}
		u.metrics.RecordSessionUploadDuration(float64(time.Since(start).Milliseconds()), fileType, mode)
		if err == nil {
			u.metrics.IncreaseStorageTotalSessions(fileType)
		}
		if err != nil {
			var fatalErr *objectstorage.FatalUploadError
			if errors.As(err, &fatalErr) {
				log.Fatalf("fatal S3 upload error (HTTP %d), terminating: %v", fatalErr.StatusCode, fatalErr.Cause)
			}
		}
		return err
	}

	var wg sync.WaitGroup
	var failedUpload [2]bool
	var uploadErrors [4]string

	wg.Add(1)
	go func() {
		defer wg.Done()
		if err := uploadFn(sid+DEV, filePath+"devtools", "devtools"); err != nil && !IsNotExist(err) {
			uploadErrors[3] = err.Error()
		}
	}()

	// new sessions will have {sid}s and {sid}e, old sessions have a single {sid} file
	if task.saveMobeAsMobs {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if err := uploadFn(sid+DOM+"s", filePath+"e", "doms"); err != nil {
				u.log.Error(ctx, "failed to upload mobe as mobs, session: %d, err: %v", task.sessionID, err)
			}
		}()
	} else if _, statErr := os.Stat(filePath + "s"); statErr == nil {
		wg.Add(2)
		go func() {
			defer wg.Done()
			if err := uploadFn(sid+DOM+"s", filePath+"s", "doms"); err != nil {
				failedUpload[1] = true
				if !IsNotExist(err) {
					uploadErrors[1] = err.Error()
				}
			}
		}()
		go func() {
			defer wg.Done()
			if err := uploadFn(sid+DOM+"e", filePath+"e", "dome"); err != nil && !IsNotExist(err) {
				uploadErrors[2] = err.Error()
			}
		}()
	} else {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if err := uploadFn(sid+DOM+"s", filePath, "doms"); err != nil {
				failedUpload[0] = true
				if !IsNotExist(err) {
					uploadErrors[0] = err.Error()
				}
			}
		}()
	}

	wg.Wait()
	if failedUpload[0] && failedUpload[1] {
		u.log.Error(ctx, "failed to upload session %d, errors: %s", task.sessionID, strings.Join(uploadErrors[:], ","))
	}
}

func (u *uploaderImpl) Clean(ctx context.Context, sessionID uint64) (err error) {
	filePath := u.cfg.FSDir + "/" + strconv.FormatUint(sessionID, 10)
	errors := make([]string, 0, 4)
	if err := os.Remove(filePath); err != nil && !os.IsNotExist(err) {
		errors = append(errors, err.Error())
	}
	if err := os.Remove(filePath + "s"); err != nil && !os.IsNotExist(err) {
		errors = append(errors, err.Error())
	}
	if err := os.Remove(filePath + "e"); err != nil && !os.IsNotExist(err) {
		errors = append(errors, err.Error())
	}
	if err := os.Remove(filePath + "devtools"); err != nil && !os.IsNotExist(err) {
		errors = append(errors, err.Error())
	}
	u.log.Debug(ctx, "cleaned storage data for session: %d", sessionID)
	if len(errors) > 0 {
		return fmt.Errorf("can't delete some files, err: %s", strings.Join(errors, ";"))
	}
	return nil
}

func (u *uploaderImpl) Wait() {
	u.uploaderPool.Pause()
}

func (u *uploaderImpl) streamZstdToS3(name, srcPath string) error {
	pr, pw := io.Pipe()
	errCh := make(chan error, 1)

	go func() {
		var wErr error
		defer func() {
			if wErr != nil {
				pw.CloseWithError(wErr)
			} else {
				pw.Close()
			}
			errCh <- wErr
		}()

		f, err := os.Open(srcPath)
		if err != nil {
			wErr = err
			return
		}
		defer f.Close()

		zw, err := zstd.NewWriter(pw, zstd.WithEncoderLevel(zstd.SpeedFastest))
		if err != nil {
			wErr = err
			return
		}
		defer zw.Close()

		_, wErr = io.CopyBuffer(zw, f, make([]byte, 256*1024))
	}()

	if err := u.objStorage.Upload(pr, name, "application/octet-stream", objectstorage.NoContentEncoding, objectstorage.Zstd); err != nil {
		pr.CloseWithError(err)
		<-errCh
		return err
	}
	return <-errCh
}
