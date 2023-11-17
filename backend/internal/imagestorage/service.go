package imagestorage

import (
	"archive/tar"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os"
	"strconv"
	"time"

	gzip "github.com/klauspost/pgzip"
	config "openreplay/backend/internal/config/imagestorage"
)

type ImageType uint8

const (
	screenshot ImageType = iota
	canvas
)

type Task struct {
	sessionID   uint64 // to generate path
	images      map[string]*bytes.Buffer
	imageType   ImageType
	isBreakTask bool
}

func NewBreakTask() *Task {
	return &Task{isBreakTask: true}
}

type ImageStorage struct {
	cfg              *config.Config
	writeToDiskTasks chan *Task
	workersStopped   chan struct{}
}

func New(cfg *config.Config) (*ImageStorage, error) {
	switch {
	case cfg == nil:
		return nil, fmt.Errorf("config is empty")
	}
	newStorage := &ImageStorage{
		cfg:              cfg,
		writeToDiskTasks: make(chan *Task, 1),
		workersStopped:   make(chan struct{}),
	}
	go newStorage.runWorker()
	return newStorage, nil
}

func (v *ImageStorage) Wait() {
	// send stop signal
	v.writeToDiskTasks <- NewBreakTask()
	// wait for workers to stop
	<-v.workersStopped
}

func (v *ImageStorage) Process(sessID uint64, data []byte) error {
	start := time.Now()
	if err := v.extract(sessID, data); err != nil {
		return err
	}
	log.Printf("sessID: %d, arch size: %d, extracted archive in: %s", sessID, len(data), time.Since(start))
	return nil
}

type ScreenshotMessage struct {
	Name string
	Data []byte
}

func (v *ImageStorage) ProcessCanvas(sessID uint64, data []byte) error {
	var msg = &ScreenshotMessage{}
	if err := json.Unmarshal(data, msg); err != nil {
		log.Printf("can't parse canvas message, err: %s", err)
	}
	// Use the same workflow
	v.writeToDiskTasks <- &Task{sessionID: sessID, images: map[string]*bytes.Buffer{msg.Name: bytes.NewBuffer(msg.Data)}, imageType: canvas}
	log.Printf("new canvas image, sessID: %d, name: %s, size: %d mb", sessID, msg.Name, len(msg.Data)/1024/1024)
	return nil
}

func (v *ImageStorage) extract(sessID uint64, data []byte) error {
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

	v.writeToDiskTasks <- &Task{sessionID: sessID, images: images, imageType: screenshot}
	return nil
}

func (v *ImageStorage) writeToDisk(task *Task) {
	// Build the directory path
	path := v.cfg.FSDir + "/"
	if task.imageType == screenshot {
		if v.cfg.ScreenshotsDir != "" {
			path += v.cfg.ScreenshotsDir + "/"
		}
	} else {
		if v.cfg.CanvasDir != "" {
			path += v.cfg.CanvasDir + "/"
		}
	}

	path += strconv.FormatUint(task.sessionID, 10) + "/"

	// Ensure the directory exists
	if err := os.MkdirAll(path, 0755); err != nil {
		log.Fatalf("Error creating directories: %v", err)
	}

	// Write images to disk
	for name, img := range task.images {
		outFile, err := os.Create(path + name) // or open file in rewrite mode
		if err != nil {
			log.Printf("can't create file: %s", err.Error())
		}
		if _, err := io.Copy(outFile, img); err != nil {
			log.Printf("can't copy file: %s", err.Error())
		}
		outFile.Close()
	}
	return
}

func (v *ImageStorage) runWorker() {
	for {
		select {
		case task := <-v.writeToDiskTasks:
			if task.isBreakTask {
				v.workersStopped <- struct{}{}
				continue
			}
			v.writeToDisk(task)
		}
	}
}
