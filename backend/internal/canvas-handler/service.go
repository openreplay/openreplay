package canvas_handler

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"time"

	config "openreplay/backend/internal/config/canvas-handler"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/objectstorage"
	"openreplay/backend/pkg/pool"
)

type ImageStorage struct {
	cfg          *config.Config
	log          logger.Logger
	basePath     string
	saverPool    pool.WorkerPool
	uploaderPool pool.WorkerPool
	objStorage   objectstorage.ObjectStorage
}

type saveTask struct {
	ctx       context.Context
	sessionID uint64
	name      string
	image     *bytes.Buffer
}

type uploadTask struct {
	ctx  context.Context
	path string
	name string
}

func New(cfg *config.Config, log logger.Logger, objStorage objectstorage.ObjectStorage) (*ImageStorage, error) {
	switch {
	case cfg == nil:
		return nil, fmt.Errorf("config is empty")
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
	}
	s.saverPool = pool.NewPool(4, 8, s.writeToDisk)
	s.uploaderPool = pool.NewPool(4, 8, s.sendToS3)
	return s, nil
}

func (v *ImageStorage) Wait() {
	v.saverPool.Pause()
	v.uploaderPool.Pause()
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

func (v *ImageStorage) writeToDisk(payload interface{}) {
	task := payload.(*saveTask)
	path := fmt.Sprintf("%s/%d/", v.basePath, task.sessionID)

	// Ensure the directory exists
	if err := os.MkdirAll(path, 0755); err != nil {
		v.log.Fatal(task.ctx, "can't create a dir, err: %s", err)
	}

	// Write images to disk
	outFile, err := os.Create(path + task.name)
	if err != nil {
		v.log.Fatal(task.ctx, "can't create an image: %s", err)
	}
	if _, err := io.Copy(outFile, task.image); err != nil {
		v.log.Fatal(task.ctx, "can't copy data to image: %s", err)
	}
	outFile.Close()

	v.log.Info(task.ctx, "canvas image saved, name: %s, size: %3.3f mb", task.name, float64(task.image.Len())/1024.0/1024.0)
	return
}

func (v *ImageStorage) PackSessionCanvases(ctx context.Context, sessID uint64) error {
	path := fmt.Sprintf("%s/%d/", v.basePath, sessID)

	// Check that the directory exists
	files, err := os.ReadDir(path)
	if err != nil {
		return err
	}
	if len(files) == 0 {
		return nil
	}

	names := make(map[string]bool)

	// Build the list of canvas images sets
	for _, file := range files {
		name := strings.Split(file.Name(), ".")
		parts := strings.Split(name[0], "_")
		if len(name) != 2 || len(parts) != 3 {
			v.log.Warn(ctx, "unknown file name: %s, skipping", file.Name())
			continue
		}
		canvasID := fmt.Sprintf("%s_%s", parts[0], parts[1])
		names[canvasID] = true
	}

	sessionID := strconv.FormatUint(sessID, 10)
	for name := range names {
		// Save to archives
		archPath := fmt.Sprintf("%s%s.tar.zst", path, name)
		fullCmd := fmt.Sprintf("find %s -type f -name '%s*' | tar -cf - --files-from=- | zstd -o %s",
			path, name, archPath)
		cmd := exec.Command("sh", "-c", fullCmd)
		var stdout, stderr bytes.Buffer
		cmd.Stdout = &stdout
		cmd.Stderr = &stderr

		err := cmd.Run()
		if err != nil {
			return fmt.Errorf("failed to execute command, err: %s, stderr: %v", err, stderr.String())
		}
		v.uploaderPool.Submit(&uploadTask{ctx: ctx, path: archPath, name: sessionID + "/" + name + ".tar.zst"})
	}
	return nil
}

func (v *ImageStorage) sendToS3(payload interface{}) {
	task := payload.(*uploadTask)
	start := time.Now()
	video, err := os.ReadFile(task.path)
	if err != nil {
		v.log.Fatal(task.ctx, "failed to read canvas archive: %s", err)
	}
	if err := v.objStorage.Upload(bytes.NewReader(video), task.name, "application/octet-stream", objectstorage.Zstd); err != nil {
		v.log.Fatal(task.ctx, "failed to upload canvas to storage: %s", err)
	}
	v.log.Info(task.ctx, "replay file (size: %d) uploaded successfully in %v", len(video), time.Since(start))
	return
}
