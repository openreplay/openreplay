package imagestorage

import (
	"archive/tar"
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"os"
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

func (v *ImageStorage) Prepare(sessID uint64) error {
	path := v.cfg.FSDir + "/"
	if v.cfg.ScreenshotsDir != "" {
		path += v.cfg.ScreenshotsDir + "/"
	}
	path += strconv.FormatUint(sessID, 10) + "/"

	// Check that the directory exists
	files, err := ioutil.ReadDir(path)
	if err != nil {
		return err
	}
	if len(files) == 0 {
		return errors.New("no screenshots found")
	}

	images := make(map[int]string)
	times := make([]int, 0, len(files))

	// Build the list of canvas images sets
	for _, file := range files {
		name := strings.Split(file.Name(), ".")
		parts := strings.Split(name[0], "_")
		if len(name) != 2 || len(parts) != 3 {
			log.Printf("unknown file name: %s, skipping", file.Name())
			continue
		}
		screenshotTS, _ := strconv.Atoi(parts[2])
		images[screenshotTS] = file.Name()
		times = append(times, screenshotTS)
	}

	// Prepare screenshot lists for ffmpeg

	mixName := fmt.Sprintf("%d-list", sessID)
	mixList := path + mixName
	outputFile, err := os.Create(mixList)
	if err != nil {
		log.Printf("can't create mix list, err: %s", err)
		return err
	}

	sort.Ints(times)
	count := 0
	for i := 0; i < len(times)-1; i++ {
		dur := float64(times[i+1]-times[i]) / 1000.0
		line := fmt.Sprintf("file %s\nduration %.3f\n", images[times[i]], dur)
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
