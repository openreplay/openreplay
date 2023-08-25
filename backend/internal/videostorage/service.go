package videostorage

import (
	"bytes"
	"fmt"
	"io/ioutil"
	"log"
	config "openreplay/backend/internal/config/videostorage"
	"openreplay/backend/pkg/objectstorage"
	"os/exec"
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
	cmd := exec.Command("ffmpeg", "-h")

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	if err != nil {
		log.Fatalf("Failed to execute command: %v, stderr: %v", err, stderr.String())
	}

	fmt.Println("Output:", stdout.String())
	return nil
}

func (v *VideoStorage) Wait() {
	return
}
