package storage

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"strconv"
	"strings"
	"sync"

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
	ctx           context.Context
	sessionID     uint64
	encryptionKey string
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
	s.uploaderPool = pool.NewPool(64, 64, s.uploadSession)
	return s, nil
}

var ErrSessionNotFound = errors.New("session files not found locally")

func (u *uploaderImpl) Upload(ctx context.Context, sessionID uint64, encryptionKey string) error {
	filePath := u.cfg.FSDir + "/" + strconv.FormatUint(sessionID, 10)
	if err := checkMobFilePresence(filePath); err != nil {
		return err
	}
	u.uploaderPool.Submit(&uploadTask{
		ctx:           ctx,
		sessionID:     sessionID,
		encryptionKey: encryptionKey,
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
	return ErrSessionNotFound
}

const (
	DOM string = "/dom.mob"
	DEV string = "/devtools.mob"
)

func (u *uploaderImpl) uploadSession(payload interface{}) {
	task := payload.(*uploadTask)
	ctx := task.ctx
	sid := strconv.FormatUint(task.sessionID, 10)
	filePath := u.cfg.FSDir + "/" + sid

	uploadFn := func(name, srcPath string) error {
		if task.encryptionKey != "" {
			return u.streamEncryptionToS3(name, task.encryptionKey, srcPath)
		}
		return u.streamZstdToS3(name, srcPath)
	}

	var wg sync.WaitGroup

	wg.Add(1)
	go func() {
		defer wg.Done()
		if err := uploadFn(sid+DEV, filePath+"devtools"); err != nil && !os.IsNotExist(err) {
			u.log.Error(ctx, "failed to upload devtools for session %d: %s", task.sessionID, err)
		}
	}()

	// new sessions will have {sid}s and {sid}e, old sessions have a single {sid} file
	if _, statErr := os.Stat(filePath + "s"); statErr == nil {
		wg.Add(2)
		go func() {
			defer wg.Done()
			if err := uploadFn(sid+DOM+"s", filePath+"s"); err != nil && !os.IsNotExist(err) {
				u.log.Error(ctx, "failed to upload dom start for session %d: %s", task.sessionID, err)
			}
		}()
		go func() {
			defer wg.Done()
			if err := uploadFn(sid+DOM+"e", filePath+"e"); err != nil && !os.IsNotExist(err) {
				u.log.Error(ctx, "failed to upload dom end for session %d: %s", task.sessionID, err)
			}
		}()
	} else {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if err := uploadFn(sid+DOM+"s", filePath); err != nil && !os.IsNotExist(err) {
				u.log.Error(ctx, "failed to upload dom for session %d: %s", task.sessionID, err)
			}
		}()
	}

	wg.Wait()
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
