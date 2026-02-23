package canvases

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	config "openreplay/backend/internal/config/canvases"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/metrics/canvas"
	"openreplay/backend/pkg/objectstorage"
	"openreplay/backend/pkg/pool"
	"openreplay/backend/pkg/queue/types"

	"github.com/klauspost/compress/zstd"
)

type ImageStorage struct {
	cfg        *config.Config
	log        logger.Logger
	basePath   string
	saverPool  pool.WorkerPool
	packerPool pool.WorkerPool
	objStorage objectstorage.ObjectStorage
	producer   types.Producer
	metrics    canvas.Canvas
	fileLocks  sync.Map // key: "sessionID/canvasName"
}

type saveTask struct {
	ctx       context.Context
	sessionID uint64
	name      string
	image     *bytes.Buffer
}

type packTask struct {
	ctx       context.Context
	sessionID uint64
	path      string
	name      string
}

func New(cfg *config.Config, log logger.Logger, objStorage objectstorage.ObjectStorage, producer types.Producer, metrics canvas.Canvas) (*ImageStorage, error) {
	switch {
	case cfg == nil:
		return nil, fmt.Errorf("config is empty")
	case log == nil:
		return nil, fmt.Errorf("logger is empty")
	case objStorage == nil:
		return nil, fmt.Errorf("objectStorage is empty")
	case producer == nil:
		return nil, fmt.Errorf("producer is empty")
	case metrics == nil:
		return nil, fmt.Errorf("metrics is empty")
	}
	path := cfg.FSDir + "/"
	if cfg.CanvasDir != "" {
		path += cfg.CanvasDir + "/"
	}
	s := &ImageStorage{
		cfg:        cfg,
		log:        log,
		basePath:   path,
		objStorage: objStorage,
		producer:   producer,
		metrics:    metrics,
	}
	s.saverPool = pool.NewPool(8, 16, s.writeToDisk)
	s.packerPool = pool.NewPool(8, 16, s.packCanvas)
	return s, nil
}

func (v *ImageStorage) Wait() {
	v.saverPool.Pause()
	v.packerPool.Pause()
}

func (v *ImageStorage) CleanSession(ctx context.Context, sessionID uint64) error {
	path := fmt.Sprintf("%s%d/", v.basePath, sessionID)
	if err := os.RemoveAll(path); err != nil {
		return fmt.Errorf("can't remove canvas directory: %s", err)
	}
	v.log.Info(ctx, "cleaned canvas data for session: %d", sessionID)
	return nil
}

func (v *ImageStorage) SaveCanvasToDisk(ctx context.Context, sessID uint64, data []byte) error {
	type canvasData struct {
		Name string
		Data []byte
	}
	var msg = &canvasData{}
	if err := json.Unmarshal(data, msg); err != nil {
		return fmt.Errorf("can't parse canvas message, err: %s", err)
	}
	v.saverPool.Submit(&saveTask{ctx: ctx, sessionID: sessID, name: msg.Name, image: bytes.NewBuffer(msg.Data)})
	return nil
}

func (v *ImageStorage) getFileLock(sessionID uint64, name string) *sync.Mutex {
	key := fmt.Sprintf("%d/%s", sessionID, name)
	val, _ := v.fileLocks.LoadOrStore(key, &sync.Mutex{})
	return val.(*sync.Mutex)
}

func (v *ImageStorage) writeToDisk(payload interface{}) {
	task := payload.(*saveTask)

	mu := v.getFileLock(task.sessionID, task.name)
	mu.Lock()
	defer mu.Unlock()

	dir := filepath.Join(v.basePath, fmt.Sprintf("%d", task.sessionID))
	if err := os.MkdirAll(dir, 0755); err != nil {
		v.log.Fatal(task.ctx, "can't create a dir, err: %s", err)
	}
	if !strings.HasSuffix(task.name, ".frames") {
		task.name = task.name + ".frames"
	}
	path := filepath.Join(dir, task.name)
	f, err := os.OpenFile(path, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		v.log.Fatal(task.ctx, "can't open frames file, err: %s", err)
	}
	defer func() {
		if err := f.Close(); err != nil {
			v.log.Error(task.ctx, "can't close frames file, err: %s", err)
		}
	}()

	if _, err := io.Copy(f, task.image); err != nil {
		v.log.Fatal(task.ctx, "can't write frame to disk, err: %s", err)
	}

	v.metrics.RecordCanvasImageSize(float64(task.image.Len()))
	v.metrics.IncreaseTotalSavedImages()

	v.log.Debug(task.ctx, "canvas image saved, name: %s, size: %3.3f mb", task.name, float64(task.image.Len())/1024.0/1024.0)
	return
}

func (v *ImageStorage) PrepareSessionCanvases(ctx context.Context, sessID uint64) error {
	start := time.Now()
	dir := filepath.Join(v.basePath, fmt.Sprintf("%d", sessID))

	files, err := os.ReadDir(dir)
	if err != nil {
		return err
	}
	if len(files) == 0 {
		return nil
	}

	for _, file := range files {
		if file.IsDir() || !strings.HasSuffix(file.Name(), ".frames") {
			continue
		}

		msg := &messages.CustomEvent{
			Name:    file.Name(),
			Payload: dir,
		}
		if err := v.producer.Produce(v.cfg.TopicCanvasTrigger, sessID, msg.Encode()); err != nil {
			v.log.Error(ctx, "can't send canvas trigger: %s", err)
		}
	}
	v.metrics.RecordPreparingDuration(time.Since(start).Seconds())

	v.log.Debug(ctx, "session canvases prepared in %.3fs, session: %d", time.Since(start).Seconds(), sessID)
	return nil
}

func (v *ImageStorage) ProcessSessionCanvas(ctx context.Context, sessID uint64, path, name string) error {
	v.packerPool.Submit(&packTask{ctx: ctx, sessionID: sessID, path: path, name: name})
	return nil
}

func (v *ImageStorage) packCanvas(payload interface{}) {
	task := payload.(*packTask)
	start := time.Now()

	v.fileLocks.Delete(fmt.Sprintf("%d/%s", task.sessionID, strings.TrimSuffix(task.name, ".frames")))

	path := filepath.Join(task.path, task.name)
	key := fmt.Sprintf("%d/%s.zst", task.sessionID, task.name)
	if err := v.streamZstdToS3(key, path); err != nil {
		v.log.Fatal(task.ctx, "can't upload canvas, name: %s, err: %s", task.name, err)
		return
	}
	v.metrics.IncreaseTotalCreatedArchives()
	v.metrics.RecordUploadingDuration(time.Since(start).Seconds())

	v.log.Debug(task.ctx, "canvas packed and uploaded successfully in %.3fs, session: %d", time.Since(start).Seconds(), task.sessionID)
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
