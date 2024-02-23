package screenshot_handler

import (
	"archive/tar"
	"bytes"
	"fmt"
	"io"
	"log"
	"openreplay/backend/pkg/objectstorage"
	"os"
	"os/exec"
	"strconv"
	"time"

	gzip "github.com/klauspost/pgzip"
	config "openreplay/backend/internal/config/imagestorage"
)

type Task struct {
	sessionID   uint64 // to generate path
	images      map[string]*bytes.Buffer
	isBreakTask bool
}

func NewBreakTask() *Task {
	return &Task{isBreakTask: true}
}

type UploadTask struct {
	sessionID   string
	path        string
	name        string
	isBreakTask bool
}

func NewBreakUploadTask() *UploadTask {
	return &UploadTask{isBreakTask: true}
}

type ImageStorage struct {
	cfg                  *config.Config
	objStorage           objectstorage.ObjectStorage
	writeToDiskTasks     chan *Task
	sendToS3Tasks        chan *UploadTask
	imageWorkerStopped   chan struct{}
	uploadWorkersStopped chan struct{}
}

func New(cfg *config.Config, objStorage objectstorage.ObjectStorage) (*ImageStorage, error) {
	switch {
	case cfg == nil:
		return nil, fmt.Errorf("config is empty")
	}
	newStorage := &ImageStorage{
		cfg:                  cfg,
		objStorage:           objStorage,
		writeToDiskTasks:     make(chan *Task, 1),
		imageWorkerStopped:   make(chan struct{}),
		uploadWorkersStopped: make(chan struct{}),
	}
	go newStorage.runWorker()
	return newStorage, nil
}

func (v *ImageStorage) Wait() {
	// send stop signal
	v.writeToDiskTasks <- NewBreakTask()
	v.sendToS3Tasks <- NewBreakUploadTask()

	// wait for workers to stop
	<-v.imageWorkerStopped
	<-v.uploadWorkersStopped
}

func (v *ImageStorage) Process(sessID uint64, data []byte) error {
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
			log.Printf("ExtractTarGz: uknown type: %d in %s", header.Typeflag, header.Name)
		}
	}

	v.writeToDiskTasks <- &Task{sessionID: sessID, images: images}
	log.Printf("sessID: %d, arch size: %d, extracted archive in: %s", sessID, len(data), time.Since(start))
	return nil
}

func (v *ImageStorage) writeToDisk(task *Task) {
	// Build the directory path
	path := v.cfg.FSDir + "/"
	if v.cfg.ScreenshotsDir != "" {
		path += v.cfg.ScreenshotsDir + "/"
	}

	path += strconv.FormatUint(task.sessionID, 10) + "/"

	// Ensure the directory exists
	if err := os.MkdirAll(path, 0755); err != nil {
		log.Fatalf("Error creating directories: %v", err)
	}

	// Write images to disk
	saved := 0
	for name, img := range task.images {
		outFile, err := os.Create(path + name) // or open file in rewrite mode
		if err != nil {
			log.Printf("can't create file: %s", err.Error())
		}
		if _, err := io.Copy(outFile, img); err != nil {
			log.Printf("can't copy file: %s", err.Error())
		}
		outFile.Close()
		saved++
	}
	log.Printf("saved %d images to disk", saved)
	return
}

func (v *ImageStorage) PackScreenshots(sessID uint64, filesPath string) error {
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
		log.Printf("Failed to execute command: %v, stderr: %v", err, stderr.String())
		return err
	}
	log.Printf("packed replay in %v", time.Since(start))

	v.sendToS3Tasks <- &UploadTask{sessionID: sessionID, path: archPath, name: sessionID + "/replay.tar.zst"}
	return nil
}

func (v *ImageStorage) sendToS3(task *UploadTask) {
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

func (v *ImageStorage) runWorker() {
	for {
		select {
		case task := <-v.writeToDiskTasks:
			if task.isBreakTask {
				v.imageWorkerStopped <- struct{}{}
				continue
			}
			v.writeToDisk(task)
		case task := <-v.sendToS3Tasks:
			if task.isBreakTask {
				v.uploadWorkersStopped <- struct{}{}
				continue
			}
			v.sendToS3(task)
		}
	}
}
