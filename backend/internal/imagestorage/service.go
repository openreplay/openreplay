package imagestorage

import (
	"archive/tar"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"openreplay/backend/pkg/objectstorage"
	"os"
	"os/exec"
	"sort"
	"strconv"
	"strings"
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

func (v *ImageStorage) PrepareCanvas(sessID uint64) ([]string, error) {
	// Build the directory path to session's canvas images
	path := v.cfg.FSDir + "/"
	if v.cfg.CanvasDir != "" {
		path += v.cfg.CanvasDir + "/"
	}
	path += strconv.FormatUint(sessID, 10) + "/"

	// Check that the directory exists
	files, err := ioutil.ReadDir(path)
	if err != nil {
		return nil, err
	}
	if len(files) == 0 {
		return []string{}, nil
	}

	type canvasData struct {
		files map[int]string
		times []int
	}
	images := make(map[string]*canvasData)

	// Build the list of canvas images sets
	for _, file := range files {
		name := strings.Split(file.Name(), ".")
		parts := strings.Split(name[0], "_")
		if len(name) != 2 || len(parts) != 3 {
			log.Printf("unknown file name: %s, skipping", file.Name())
			continue
		}
		canvasID := fmt.Sprintf("%s_%s", parts[0], parts[1])
		canvasTS, _ := strconv.Atoi(parts[2])
		if _, ok := images[canvasID]; !ok {
			images[canvasID] = &canvasData{
				files: make(map[int]string),
				times: make([]int, 0),
			}
		}
		images[canvasID].files[canvasTS] = file.Name()
		images[canvasID].times = append(images[canvasID].times, canvasTS)
	}

	// Prepare screenshot lists for ffmpeg
	namesList := make([]string, 0)
	for name, cData := range images {
		// Write to file
		mixName := fmt.Sprintf("%s-list", name)
		mixList := path + mixName
		outputFile, err := os.Create(mixList)
		if err != nil {
			log.Printf("can't create mix list, err: %s", err)
			continue
		}

		sort.Ints(cData.times)
		count := 0
		for i := 0; i < len(cData.times)-1; i++ {
			dur := float64(cData.times[i+1]-cData.times[i]) / 1000.0
			line := fmt.Sprintf("file %s\nduration %.3f\n", cData.files[cData.times[i]], dur)
			_, err := outputFile.WriteString(line)
			if err != nil {
				outputFile.Close()
				log.Printf("%s", err)
				continue
			}
			count++
		}
		outputFile.Close()
		log.Printf("new canvas mix %s with %d images", mixList, count)
		namesList = append(namesList, mixName)
	}
	log.Printf("prepared %d canvas mixes for session %d", len(namesList), sessID)
	return namesList, nil
}

func (v *ImageStorage) ProcessCanvas(sessID uint64, data []byte) error {
	var msg = &ScreenshotMessage{}
	if err := json.Unmarshal(data, msg); err != nil {
		log.Printf("can't parse canvas message, err: %s", err)
	}
	// Use the same workflow
	v.writeToDiskTasks <- &Task{sessionID: sessID, images: map[string]*bytes.Buffer{msg.Name: bytes.NewBuffer(msg.Data)}, imageType: canvas}
	log.Printf("new canvas image, sessID: %d, name: %s, size: %3.3f mb", sessID, msg.Name, float64(len(msg.Data))/1024.0/1024.0)
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
