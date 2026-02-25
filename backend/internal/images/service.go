package images

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	config "openreplay/backend/internal/config/images"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/metrics/images"
	"openreplay/backend/pkg/objectstorage"
	"openreplay/backend/pkg/pool"
	"os"
	"strconv"

	"github.com/klauspost/compress/zstd"
)

type saveTask struct {
	ctx       context.Context
	sessionID uint64
	name      string
	data      []byte
}

type uploadTask struct {
	ctx       context.Context
	sessionID string
	path      string
	name      string
}

type ImageStorage struct {
	cfg          *config.Config
	log          logger.Logger
	objStorage   objectstorage.ObjectStorage
	saverPool    pool.WorkerPool
	uploaderPool pool.WorkerPool
	metrics      images.Images
}

func New(cfg *config.Config, log logger.Logger, objStorage objectstorage.ObjectStorage, metrics images.Images) (*ImageStorage, error) {
	switch {
	case cfg == nil:
		return nil, fmt.Errorf("config is empty")
	case log == nil:
		return nil, fmt.Errorf("logger is empty")
	case objStorage == nil:
		return nil, fmt.Errorf("objStorage is empty")
	case metrics == nil:
		return nil, fmt.Errorf("metrics is empty")
	}
	s := &ImageStorage{
		cfg:        cfg,
		log:        log,
		objStorage: objStorage,
		metrics:    metrics,
	}
	s.saverPool = pool.NewPool(8, 16, s.writeToDisk)
	s.uploaderPool = pool.NewPool(8, 16, s.sendToS3)
	return s, nil
}

func (v *ImageStorage) Wait() {
	v.saverPool.Pause()
	v.uploaderPool.Pause()
}

func (v *ImageStorage) CleanSession(ctx context.Context, sessionID uint64) error {
	path := v.cfg.FSDir + "/"
	if v.cfg.ScreenshotsDir != "" {
		path += v.cfg.ScreenshotsDir + "/"
	}
	path += strconv.FormatUint(sessionID, 10) + "/"
	if err := os.RemoveAll(path); err != nil {
		return fmt.Errorf("can't remove screenshots directory: %s", err)
	}
	v.log.Info(ctx, "cleaned screenshots data for session: %d", sessionID)
	return nil
}

type ImagesMessage struct {
	Name string
	Data []byte
}

func (v *ImageStorage) Process(ctx context.Context, sessID uint64, data []byte) error {
	var msg = &ImagesMessage{}
	if err := json.Unmarshal(data, msg); err != nil {
		return fmt.Errorf("can't parse canvas message, err: %s", err)
	}
	v.saverPool.Submit(&saveTask{ctx: ctx, sessionID: sessID, name: msg.Name, data: msg.Data})
	return nil
}

func (v *ImageStorage) writeToDisk(payload interface{}) {
	task := payload.(*saveTask)

	path := v.cfg.FSDir + "/"
	if v.cfg.ScreenshotsDir != "" {
		path += v.cfg.ScreenshotsDir + "/"
	}
	path += strconv.FormatUint(task.sessionID, 10) + "/"

	if err := os.MkdirAll(path, 0755); err != nil {
		v.log.Fatal(task.ctx, "error creating directories: %v", err)
	}

	f, err := os.OpenFile(path+"replay.frames", os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		v.log.Fatal(task.ctx, "can't open frames file, err: %s", err)
	}
	defer func() {
		if err := f.Close(); err != nil {
			v.log.Error(task.ctx, "can't close frames file, err: %s", err)
		}
	}()

	if _, err := io.Copy(f, bytes.NewBuffer(task.data)); err != nil {
		v.log.Fatal(task.ctx, "can't write frame to disk, err: %s", err)
	}
	return
}

func (v *ImageStorage) PackScreenshots(ctx context.Context, sessID uint64, filesPath string) error {
	sessionID := strconv.FormatUint(sessID, 10)
	v.uploaderPool.Submit(&uploadTask{ctx: ctx, sessionID: sessionID, path: filesPath + "replay.frames", name: sessionID + "/replay.frames.zst"})
	return nil
}

func (v *ImageStorage) sendToS3(payload interface{}) {
	task := payload.(*uploadTask)

	if err := v.streamZstdToS3(task.name, task.path); err != nil {
		v.log.Fatal(task.ctx, "can't upload canvas, name: %s, err: %s", task.name, err)
		return
	}
	return
}

func (v *ImageStorage) streamZstdToS3(key, srcPath string) error {
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

	if err := v.objStorage.Upload(pr, key, "application/octet-stream", objectstorage.NoContentEncoding, objectstorage.Zstd); err != nil {
		pr.CloseWithError(err)
		<-errCh
		return err
	}
	return <-errCh
}
