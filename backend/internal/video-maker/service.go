package video_maker

import (
	"bytes"
	"fmt"
	"log"
	"openreplay/backend/pkg/pool"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"time"

	config "openreplay/backend/internal/config/videostorage"
	"openreplay/backend/pkg/objectstorage"
)

type uploadTask struct {
	path string
	name string
}

type VideoStorage struct {
	cfg          *config.Config
	objStorage   objectstorage.ObjectStorage
	uploaderPool pool.WorkerPool
}

func New(cfg *config.Config, objStorage objectstorage.ObjectStorage) (*VideoStorage, error) {
	switch {
	case cfg == nil:
		return nil, fmt.Errorf("config is empty")
	case objStorage == nil:
		return nil, fmt.Errorf("object storage is empty")
	}
	s := &VideoStorage{
		cfg:        cfg,
		objStorage: objStorage,
	}
	s.uploaderPool = pool.NewPool(4, 4, s.sendToS3)
	return s, nil
}

func (v *VideoStorage) Process(sessID uint64, filesPath, canvasMix string) error {
	name := strings.TrimSuffix(canvasMix, "-list")
	mixList := fmt.Sprintf("%s%s", filesPath, canvasMix)
	// check that mixList exists
	if _, err := os.ReadFile(mixList); err != nil {
		return err
	}
	videoPath := fmt.Sprintf("%s%s.mp4", filesPath, name)

	// Run ffmpeg to build video
	start := time.Now()
	sessionID := strconv.FormatUint(sessID, 10)

	cmd := exec.Command("ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", mixList, "-vf", "pad=ceil(iw/2)*2:ceil(ih/2)*2", "-vsync", "vfr",
		"-pix_fmt", "yuv420p", "-preset", "ultrafast", videoPath)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	if err != nil {
		log.Printf("Failed to execute command: %v, stderr: %v", err, stderr.String())
		return err
	}
	log.Printf("made video replay in %v", time.Since(start))
	v.uploaderPool.Submit(&uploadTask{path: videoPath, name: sessionID + "/" + name + ".mp4"})
	return nil
}

func (v *VideoStorage) sendToS3(payload interface{}) {
	task := payload.(*uploadTask)
	start := time.Now()
	video, err := os.ReadFile(task.path)
	if err != nil {
		log.Fatalf("Failed to read video file: %v", err)
	}
	if err := v.objStorage.Upload(bytes.NewReader(video), task.name, "video/mp4", objectstorage.NoCompression); err != nil {
		log.Fatalf("Storage: start uploading replay failed. %s", err)
	}
	log.Printf("Viode file (size: %d) uploaded successfully in %v", len(video), time.Since(start))
	return
}

func (v *VideoStorage) Wait() {
	v.uploaderPool.Pause()
}
