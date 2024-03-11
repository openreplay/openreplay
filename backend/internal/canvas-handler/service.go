package canvas_handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"openreplay/backend/pkg/objectstorage"
	"openreplay/backend/pkg/pool"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"time"

	config "openreplay/backend/internal/config/canvas-handler"
)

type saveTask struct {
	sessionID uint64
	name      string
	image     *bytes.Buffer
}

type uploadTask struct {
	path string
	name string
}

type ImageStorage struct {
	cfg          *config.Config
	basePath     string
	saverPool    pool.WorkerPool
	uploaderPool pool.WorkerPool
	objStorage   objectstorage.ObjectStorage
}

func New(cfg *config.Config, objStorage objectstorage.ObjectStorage) (*ImageStorage, error) {
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
		basePath:   path,
		objStorage: objStorage,
	}
	s.saverPool = pool.NewPool(4, 8, s.writeToDisk)
	s.uploaderPool = pool.NewPool(4, 8, s.sendToS3)
	return s, nil
}

func (v *ImageStorage) Wait() {
	v.saverPool.Pause()
}

func (v *ImageStorage) sendToS3(payload interface{}) {
	task := payload.(*uploadTask)
	start := time.Now()
	video, err := os.ReadFile(task.path)
	if err != nil {
		log.Fatalf("Failed to read video file: %v", err)
	}
	if err := v.objStorage.Upload(bytes.NewReader(video), task.name, "application/octet-stream", objectstorage.Zstd); err != nil {
		log.Fatalf("Storage: start uploading replay failed. %s", err)
	}
	log.Printf("Replay file (size: %d) uploaded successfully in %v", len(video), time.Since(start))
	return
}

func (v *ImageStorage) PackSessionCanvases(sessID uint64) error {
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
			log.Printf("unknown file name: %s, skipping", file.Name())
			continue
		}
		canvasID := fmt.Sprintf("%s_%s", parts[0], parts[1])
		names[canvasID] = true
	}

	sessionID := strconv.FormatUint(sessID, 10)
	//
	for name := range names {
		// Save to archives
		archPath := fmt.Sprintf("%s%s.tar.zst", path, name)
		fullCmd := fmt.Sprintf("find %s -type f -name '%s*' | tar -cf - --files-from=- | zstd -o %s",
			path, name, archPath)
		log.Printf("Executing command: %s", fullCmd)
		cmd := exec.Command("sh", "-c", fullCmd)
		var stdout, stderr bytes.Buffer
		cmd.Stdout = &stdout
		cmd.Stderr = &stderr

		err := cmd.Run()
		if err != nil {
			log.Printf("Failed to execute command: %v, stderr: %v", err, stderr.String())
			return err
		}

		v.uploaderPool.Submit(&uploadTask{path: archPath, name: sessionID + "/" + name + ".tar.zst"})
	}
	return nil
}

func (v *ImageStorage) SaveCanvasToDisk(sessID uint64, data []byte) error {
	type canvasData struct {
		Name string
		Data []byte
	}
	var msg = &canvasData{}
	if err := json.Unmarshal(data, msg); err != nil {
		log.Printf("can't parse canvas message, err: %s", err)
	}
	// Use the same workflow
	v.saverPool.Submit(&saveTask{sessionID: sessID, name: msg.Name, image: bytes.NewBuffer(msg.Data)})
	return nil
}

func (v *ImageStorage) writeToDisk(payload interface{}) {
	task := payload.(*saveTask)
	path := fmt.Sprintf("%s/%d/", v.basePath, task.sessionID)

	// Ensure the directory exists
	if err := os.MkdirAll(path, 0755); err != nil {
		log.Fatalf("Error creating directories: %v", err)
	}

	// Write images to disk
	outFile, err := os.Create(path + task.name) // or open file in rewrite mode
	if err != nil {
		log.Printf("can't create file: %s", err.Error())
	}
	if _, err := io.Copy(outFile, task.image); err != nil {
		log.Printf("can't copy file: %s", err.Error())
	}
	outFile.Close()

	log.Printf("new canvas image, sessID: %d, name: %s, size: %3.3f mb", task.sessionID, task.name, float64(task.image.Len())/1024.0/1024.0)
	return
}
