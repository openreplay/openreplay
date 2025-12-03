package images

import (
	"archive/tar"
	"bytes"
	"context"
	"fmt"
	"io"
	"os"
	"os/exec"
	"strconv"
	"time"

	gzip "github.com/klauspost/pgzip"

	config "openreplay/backend/internal/config/images"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/metrics/images"
	"openreplay/backend/pkg/objectstorage"
	"openreplay/backend/pkg/pool"
)

type saveTask struct {
	ctx       context.Context
	sessionID uint64
	images    map[string]*bytes.Buffer
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
	s.saverPool = pool.NewPool(4, 8, s.writeToDisk)
	s.uploaderPool = pool.NewPool(8, 8, s.sendToS3)
	return s, nil
}

func (v *ImageStorage) Wait() {
	v.saverPool.Pause()
	v.uploaderPool.Pause()
}

func (v *ImageStorage) Process(ctx context.Context, sessID uint64, data []byte) error {
	start := time.Now()
	images := make(map[string]*bytes.Buffer)
	uncompressedStream, err := gzip.NewReader(bytes.NewReader(data))
	if err != nil {
		return fmt.Errorf("can't create gzip reader: %s", err.Error())
	}
	tarReader := tar.NewReader(uncompressedStream)

	for {
		header, err := tarReader.Next()
		if err != nil {
			if err == io.EOF {
				break
			}
			return fmt.Errorf("can't read tar header: %s", err.Error())
		}

		if header.Typeflag == tar.TypeReg {
			var buf bytes.Buffer
			if _, err := buf.ReadFrom(tarReader); err != nil {
				return fmt.Errorf("can't copy file: %s", err.Error())
			}
			images[header.Name] = &buf
		} else {
			v.log.Error(ctx, "ExtractTarGz: unknown type: %d in %s", header.Typeflag, header.Name)
		}
	}
	v.metrics.RecordOriginalArchiveExtractionDuration(time.Since(start).Seconds())
	v.metrics.RecordOriginalArchiveSize(float64(len(images)))
	v.metrics.IncreaseTotalSavedArchives()

	v.log.Debug(ctx, "arch size: %d, extracted archive in: %s", len(data), time.Since(start))
	v.saverPool.Submit(&saveTask{ctx: ctx, sessionID: sessID, images: images})
	return nil
}

func (v *ImageStorage) writeToDisk(payload interface{}) {
	task := payload.(*saveTask)
	// Build the directory path
	path := v.cfg.FSDir + "/"
	if v.cfg.ScreenshotsDir != "" {
		path += v.cfg.ScreenshotsDir + "/"
	}
	path += strconv.FormatUint(task.sessionID, 10) + "/"

	// Ensure the directory exists
	if err := os.MkdirAll(path, 0755); err != nil {
		v.log.Fatal(task.ctx, "error creating directories: %v", err)
	}

	// Write images to disk
	saved := 0
	for name, img := range task.images {
		start := time.Now()
		outFile, err := os.Create(path + name) // or open file in rewrite mode
		if err != nil {
			v.log.Error(task.ctx, "can't create file: %s", err.Error())
		}
		if _, err := io.Copy(outFile, img); err != nil {
			v.log.Error(task.ctx, "can't copy file: %s", err.Error())
		}
		if outFile == nil {
			continue
		}
		if err := outFile.Close(); err != nil {
			v.log.Warn(task.ctx, "can't close file: %s", err.Error())
		}
		v.metrics.RecordSavingImageDuration(time.Since(start).Seconds())
		v.metrics.IncreaseTotalSavedImages()
		saved++
	}
	v.log.Debug(task.ctx, "saved %d images to disk", saved)
	return
}

func (v *ImageStorage) PackScreenshots(ctx context.Context, sessID uint64, filesPath string) error {
	start := time.Now()
	sessionID := strconv.FormatUint(sessID, 10)
	selector := fmt.Sprintf("%s*.jpeg", filesPath)
	archPath := filesPath + "replay.tar.zst"

	// tar cf - ./*.jpeg | zstd -o replay.tar.zst
	fullCmd := fmt.Sprintf("tar cf - %s | zstd -o %s", selector, archPath)
	cmd := exec.Command("sh", "-c", fullCmd)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	if err != nil {
		return fmt.Errorf("failed to execute command: %v, stderr: %v", err, stderr.String())
	}
	v.metrics.RecordArchivingDuration(time.Since(start).Seconds())
	v.metrics.IncreaseTotalCreatedArchives()

	v.log.Debug(ctx, "packed replay in %v", time.Since(start))
	v.uploaderPool.Submit(&uploadTask{ctx: ctx, sessionID: sessionID, path: archPath, name: sessionID + "/replay.tar.zst"})
	return nil
}

func (v *ImageStorage) sendToS3(payload interface{}) {
	task := payload.(*uploadTask)
	start := time.Now()
	video, err := os.ReadFile(task.path)
	if err != nil {
		v.log.Fatal(task.ctx, "failed to read replay file: %s", err)
	}
	if err := v.objStorage.Upload(bytes.NewReader(video), task.name, "application/octet-stream", objectstorage.NoContentEncoding, objectstorage.Zstd); err != nil {
		v.log.Fatal(task.ctx, "failed to upload replay file: %s", err)
	}
	v.metrics.RecordUploadingDuration(time.Since(start).Seconds())
	v.metrics.RecordArchiveSize(float64(len(video)))

	v.log.Debug(task.ctx, "replay file (size: %d) uploaded successfully in %v", len(video), time.Since(start))
	return
}
