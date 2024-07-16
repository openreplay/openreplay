package spot

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"openreplay/backend/internal/config/spot"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/objectstorage"
	"os"
	"os/exec"
	"strconv"
	"time"
)

type Transcoder interface {
	Transcode(spotID uint64) error
	Close()
}

type transcoderImpl struct {
	cfg        *spot.Config
	log        logger.Logger
	queue      chan uint64 // in-memory queue for transcoding
	objStorage objectstorage.ObjectStorage
}

func NewTranscoder(cfg *spot.Config, log logger.Logger, objStorage objectstorage.ObjectStorage) Transcoder {
	tnsc := &transcoderImpl{
		cfg:        cfg,
		log:        log,
		queue:      make(chan uint64, 100),
		objStorage: objStorage,
	}
	go tnsc.mainLoop()
	return tnsc
}

func (t *transcoderImpl) Transcode(spotID uint64) error {
	t.queue <- spotID
	return nil
}

func (t *transcoderImpl) mainLoop() {
	for {
		select {
		case spotID := <-t.queue:
			t.transcode(spotID)
		}
	}
}

func (t *transcoderImpl) transcode(spotID uint64) {
	t.log.Info(context.Background(), "Transcoding spot %s", spotID)

	// Prepare path for spot video
	path := t.cfg.FSDir + "/"
	if t.cfg.SpotsDir != "" {
		path += t.cfg.SpotsDir + "/"
	}
	path += strconv.FormatUint(spotID, 10) + "/"

	// Ensure the directory exists
	if err := os.MkdirAll(path, 0755); err != nil {
		t.log.Fatal(context.Background(), "Error creating directories: %v", err)
	}

	video, err := t.objStorage.Get(fmt.Sprintf("%d/video.webm", spotID))
	if err != nil {
		t.log.Error(context.Background(), "Failed to download spot %s: %s", spotID, err)
		return
	}
	defer video.Close()

	// Save file to disk
	originVideo, err := os.Create(path + "origin.webm")
	if err != nil {
		t.log.Error(context.Background(), "can't create file: %s", err.Error())
		return
	}
	if _, err := io.Copy(originVideo, video); err != nil {
		t.log.Error(context.Background(), "can't copy file: %s", err.Error())
		return
	}
	originVideo.Close()
	t.log.Info(context.Background(), "Saved origin video to disk, spot: %d", spotID)

	// Transcode video tp HLS format
	// ffmpeg -i origin.webm -codec: copy -start_number 0 -hls_time 10 -hls_list_size 0 -f hls index.m3u8
	start := time.Now()
	videoPath := path + "origin.webm"
	playlistPath := path + "index.m3u8"
	cmd := exec.Command("ffmpeg", "-i", videoPath, "-codec: copy", "-start_number", "0", "-hls_time", "10",
		"-hls_list_size", "0", "-f", "hls", playlistPath)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err = cmd.Run()
	if err != nil {
		t.log.Error(context.Background(), "Failed to execute command: %v, stderr: %v", err, stderr.String())
		return
	}
	t.log.Info(context.Background(), "Transcoded spot %d in %v", spotID, time.Since(start))

	// Upload transcoded spot to S3 (chunks only)
	files, err := os.ReadDir(path)
	if err != nil || len(files) == 0 {
		t.log.Error(context.Background(), "Failed to read directory %s: %s", path, err)
		return
	}
	chunks := make(map[string]string) // origin chuck name -> pre-signed url
	for _, file := range files {
		if file.IsDir() || file.Name() == "origin.webm" || file.Name() == "index.m3u8" {
			continue
		}
		chunks[file.Name()] = file.Name()
	}

	t.log.Info(context.Background(), "Transcoded spot %d, have to upload chunks to S3", spotID)
}

func (t *transcoderImpl) Close() {
	close(t.queue)
}
