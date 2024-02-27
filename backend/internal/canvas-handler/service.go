package canvas_handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"openreplay/backend/pkg/pool"
	"os"
	"sort"
	"strconv"
	"strings"

	config "openreplay/backend/internal/config/imagestorage"
)

type saveTask struct {
	sessionID uint64
	name      string
	image     *bytes.Buffer
}

type ImageStorage struct {
	cfg       *config.Config
	basePath  string
	saverPool pool.WorkerPool
}

func New(cfg *config.Config) (*ImageStorage, error) {
	switch {
	case cfg == nil:
		return nil, fmt.Errorf("config is empty")
	}
	path := cfg.FSDir + "/"
	if cfg.CanvasDir != "" {
		path += cfg.CanvasDir + "/"
	}
	s := &ImageStorage{
		cfg:      cfg,
		basePath: path,
	}
	s.saverPool = pool.NewPool(4, 8, s.writeToDisk)
	return s, nil
}

func (v *ImageStorage) Wait() {
	v.saverPool.Pause()
}

func (v *ImageStorage) PrepareCanvasList(sessID uint64) ([]string, error) {
	path := fmt.Sprintf("%s/%d/", v.basePath, sessID)

	// Check that the directory exists
	files, err := os.ReadDir(path)
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
