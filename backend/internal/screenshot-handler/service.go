package screenshot_handler

import (
	"archive/tar"
	"bytes"
	"context"
	"fmt"
	"io"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/objectstorage"
	"openreplay/backend/pkg/pool"
	"os"
	"os/exec"
	"strconv"
	"time"

	gzip "github.com/klauspost/pgzip"
	config "openreplay/backend/internal/config/imagestorage"
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
}

func New(cfg *config.Config, log logger.Logger, objStorage objectstorage.ObjectStorage) (*ImageStorage, error) {
	switch {
	case cfg == nil:
		return nil, fmt.Errorf("config is empty")
	}
	s := &ImageStorage{
		cfg:        cfg,
		log:        log,
		objStorage: objStorage,
	}
	s.saverPool = pool.NewPool(4, 8, s.writeToDisk)
	s.uploaderPool = pool.NewPool(4, 4, s.sendToS3)
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

	v.log.Info(ctx, "arch size: %d, extracted archive in: %s", len(data), time.Since(start))
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
		v.log.Fatal(task.ctx, "Error creating directories: %v", err)
	}

	// Write images to disk
	saved := 0
	for name, img := range task.images {
		outFile, err := os.Create(path + name) // or open file in rewrite mode
		if err != nil {
			v.log.Error(task.ctx, "can't create file: %s", err.Error())
		}
		if _, err := io.Copy(outFile, img); err != nil {
			v.log.Error(task.ctx, "can't copy file: %s", err.Error())
		}
		outFile.Close()
		saved++
	}
	v.log.Info(task.ctx, "saved %d images to disk", saved)
	return
}

func (v *ImageStorage) PackScreenshots(ctx context.Context, sessID uint64, filesPath string) error {
	// Temporarily disabled for tests
	if v.objStorage == nil {
		return fmt.Errorf("object storage is empty")
	}
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
	v.log.Info(ctx, "packed replay in %v", time.Since(start))

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
	if err := v.objStorage.Upload(bytes.NewReader(video), task.name, "application/octet-stream", objectstorage.Zstd); err != nil {
		v.log.Fatal(task.ctx, "failed to upload replay file: %s", err)
	}
	v.log.Info(task.ctx, "replay file (size: %d) uploaded successfully in %v", len(video), time.Since(start))
	return
}
