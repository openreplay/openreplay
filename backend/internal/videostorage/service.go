package videostorage

import (
	"bytes"
	"fmt"
	"io/ioutil"
	"log"
	config "openreplay/backend/internal/config/videostorage"
	"openreplay/backend/pkg/objectstorage"
	"os/exec"
	"strconv"
)

type VideoStorage struct {
	cfg        *config.Config
	objStorage objectstorage.ObjectStorage
}

func New(cfg *config.Config, objStorage objectstorage.ObjectStorage) (*VideoStorage, error) {
	switch {
	case cfg == nil:
		return nil, fmt.Errorf("config is empty")
	case objStorage == nil:
		return nil, fmt.Errorf("object storage is empty")
	}
	newStorage := &VideoStorage{
		cfg:        cfg,
		objStorage: objStorage,
	}
	return newStorage, nil
}

func (v *VideoStorage) Process(sessID uint64, filesPath string) error {
	files, _ := ioutil.ReadDir(filesPath)
	fmt.Printf("There are %d screenshot of session %d", len(files), sessID)
	// Try to call ffmpeg and print the result
	sessionID := strconv.FormatUint(sessID, 10)
	imagesPath := "/mnt/efs/screenshots/" + sessionID + "/%06d.jpeg"
	videoPath := "/mnt/efs/screenshots/" + sessionID + "/replay.mp4"
	cmd := exec.Command("ffmpeg", "-y", "-f", "image2", "-framerate", "3", "-start_number", "000000", "-i",
		imagesPath, "-vf", "scale=-2:1064", "-c:v", "libx264", "-preset", "medium", "-crf", "23",
		videoPath)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	if err != nil {
		log.Fatalf("Failed to execute command: %v, stderr: %v", err, stderr.String())
	}

	fmt.Println("Output:", stdout.String())
	video, err := ioutil.ReadFile(videoPath)
	if err != nil {
		log.Fatalf("Failed to read video file: %v", err)
	}
	log.Printf("Video file size: %d", len(video))
	return nil
}

func (v *VideoStorage) Wait() {
	return
}
