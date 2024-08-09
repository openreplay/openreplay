package transcoder

import (
	"bufio"
	"bytes"
	"context"
	"fmt"
	"io"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"time"

	"openreplay/backend/internal/config/spot"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
	metrics "openreplay/backend/pkg/metrics/spot"
	"openreplay/backend/pkg/objectstorage"
	"openreplay/backend/pkg/spot/service"
)

type Transcoder interface {
	Transcode(spot *service.Spot) error
	GetSpotStreamPlaylist(spotID uint64) ([]byte, error)
	Close()
}

type transcoderImpl struct {
	cfg        *spot.Config
	log        logger.Logger
	queue      chan *service.Spot // in-memory queue for transcoding
	objStorage objectstorage.ObjectStorage
	conn       pool.Pool
	tasks      Tasks
	streams    Streams
	spots      service.Spots
}

func NewTranscoder(cfg *spot.Config, log logger.Logger, objStorage objectstorage.ObjectStorage, conn pool.Pool, spots service.Spots) Transcoder {
	tnsc := &transcoderImpl{
		cfg:        cfg,
		log:        log,
		queue:      make(chan *service.Spot, 100),
		objStorage: objStorage,
		conn:       conn,
		tasks:      NewTasks(conn),
		streams:    NewStreams(log, conn, objStorage),
		spots:      spots,
	}
	go tnsc.mainLoop()
	return tnsc
}

func (t *transcoderImpl) Transcode(spot *service.Spot) error {
	t.queue <- spot
	return nil
}

func (t *transcoderImpl) mainLoop() {
	for {
		select {
		case spot := <-t.queue:
			start := time.Now()
			t.transcode(spot)
			t.log.Info(context.Background(), "total time for transcoding spot %d - %v sec", spot.ID, time.Since(start).Seconds())
		}
	}
}

func (t *transcoderImpl) transcode(spot *service.Spot) {
	metrics.IncreaseVideosTotal()
	spotID := spot.ID
	t.log.Info(context.Background(), "Processing spot %s", spotID)

	if spot.Crop == nil && spot.Duration < 15000 {
		t.log.Info(context.Background(), "Spot video %+v is too short for transcoding and without crop values", spot)
		return
	}

	// Prepare path for spot video
	path := t.cfg.FSDir + "/"
	if t.cfg.SpotsDir != "" {
		path += t.cfg.SpotsDir + "/"
	}
	path += strconv.FormatUint(spotID, 10) + "/"

	// Download video from S3
	t.downloadSpotVideo(spotID, path)

	// Crop video if needed
	if spot.Crop != nil && len(spot.Crop) == 2 {
		t.cropSpotVideo(spotID, spot.Crop, path)
	}

	if spot.Duration < 15000 {
		t.log.Info(context.Background(), "Spot video %d is too short for transcoding", spotID)
		return
	}

	// Transcode spot video to HLS format
	streamPlaylist, err := t.transcodeSpotVideo(spotID, path)
	if err != nil {
		t.log.Error(context.Background(), "Error transcoding spot %d: %v", spotID, err)
		return
	}

	// Save stream playlist to DB
	if err := t.streams.Add(spotID, streamPlaylist); err != nil {
		t.log.Error(context.Background(), "Error adding spot stream to DB: %v", err)
		return
	}

	if err := t.spots.SetStatus(spotID, "processed"); err != nil {
		t.log.Error(context.Background(), "Error updating spot status: %v", err)
	}
	t.log.Info(context.Background(), "Transcoded spot %d, have to upload chunks to S3", spotID)
}

func (t *transcoderImpl) downloadSpotVideo(spotID uint64, path string) {
	start := time.Now()

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
	if fileInfo, err := originVideo.Stat(); err != nil {
		t.log.Error(context.Background(), "Failed to get file info: %v", err)
	} else {
		metrics.RecordOriginalVideoSize(float64(fileInfo.Size()))
	}
	originVideo.Close()

	metrics.RecordOriginalVideoDownloadDuration(time.Since(start).Seconds())

	t.log.Info(context.Background(), "Saved origin video to disk, spot: %d in %v sec", spotID, time.Since(start).Seconds())
}

func (t *transcoderImpl) cropSpotVideo(spotID uint64, crop []int, path string) {
	// Crop video
	// ffmpeg -i input.webm -ss 5 -to 20 -c copy output.webm

	start := time.Now()
	cmd := exec.Command("ffmpeg", "-i", path+"origin.webm",
		"-ss", fmt.Sprintf("%.2f", float64(crop[0])/1000.0),
		"-to", fmt.Sprintf("%.2f", float64(crop[1])/1000.0),
		"-c", "copy", path+"cropped.mp4")
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	if err != nil {
		t.log.Error(context.Background(), "Failed to execute command: %v, stderr: %v", err, stderr.String())
		return
	}
	metrics.IncreaseVideosCropped()
	metrics.RecordCroppingDuration(time.Since(start).Seconds())

	t.log.Info(context.Background(), "Cropped spot %d in %v", spotID, time.Since(start).Seconds())

	// mv cropped.webm origin.webm
	err = os.Rename(path+"cropped.mp4", path+"origin.webm")

	// upload cropped video back to s3
	start = time.Now()
	video, err := os.Open(path + "origin.webm")
	if err != nil {
		t.log.Error(context.Background(), "Failed to open cropped video: %v", err)
		return
	}
	defer video.Close()

	if fileInfo, err := video.Stat(); err != nil {
		t.log.Error(context.Background(), "Failed to get file info: %v", err)
	} else {
		metrics.RecordCroppedVideoSize(float64(fileInfo.Size()))
	}

	err = t.objStorage.Upload(video, fmt.Sprintf("%d/video.webm", spotID), "video/webm", objectstorage.NoCompression)
	if err != nil {
		t.log.Error(context.Background(), "Failed to upload cropped video: %v", err)
		return
	}

	metrics.RecordCroppedVideoUploadDuration(time.Since(start).Seconds())

	t.log.Info(context.Background(), "Uploaded cropped spot %d in %v", spotID, time.Since(start).Seconds())
}

func (t *transcoderImpl) transcodeSpotVideo(spotID uint64, path string) (string, error) {
	// Transcode video tp HLS format
	// ffmpeg -i origin.webm -c:v copy -c:a aac -b:a 128k -start_number 0 -hls_time 10 -hls_list_size 0 -f hls index.m3u8

	start := time.Now()
	videoPath := path + "origin.webm"
	playlistPath := path + "index.m3u8"
	cmd := exec.Command("ffmpeg", "-i", videoPath, "-c:v", "copy", "-c:a", "aac", "-b:a", "96k",
		"-start_number", "0", "-hls_time", "10", "-hls_list_size", "0", "-f", "hls", playlistPath)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	if err != nil {
		t.log.Error(context.Background(), "Failed to execute command: %v, stderr: %v", err, stderr.String())
		return "", err
	}
	metrics.IncreaseVideosTranscoded()
	metrics.RecordTranscodingDuration(time.Since(start).Seconds())
	t.log.Info(context.Background(), "Transcoded spot %d in %v", spotID, time.Since(start).Seconds())

	start = time.Now()
	// Read the M3U8 file
	file, err := os.Open(playlistPath)
	if err != nil {
		fmt.Println("Error opening file:", err)
		return "", err
	}
	defer file.Close()

	var originalLines []string
	var lines []string
	var chunks []string

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		lines = append(lines, line)
		if strings.HasPrefix(line, "index") && strings.HasSuffix(line, ".ts") {
			chunks = append(chunks, line)
		}
		originalLines = append(originalLines, line)
	}
	if err := scanner.Err(); err != nil {
		fmt.Println("Error reading file:", err)
		return "", err
	}

	// Insert stream chunks to s3
	for _, chunk := range chunks {
		chunkPath := path + chunk
		chunkFile, err := os.Open(chunkPath)
		if err != nil {
			fmt.Println("Error opening file:", err)
			return "", err
		}
		defer chunkFile.Close()

		key := fmt.Sprintf("%d/%s", spotID, chunk)
		err = t.objStorage.Upload(chunkFile, key, "video/mp2t", objectstorage.NoCompression)
		if err != nil {
			fmt.Println("Error uploading file:", err)
			return "", err
		}
	}
	metrics.RecordTranscodedVideoUploadDuration(time.Since(start).Seconds())

	t.log.Info(context.Background(), "Uploaded chunks for spot %d in %v", spotID, time.Since(start).Seconds())
	return strings.Join(lines, "\n"), nil
}

func (t *transcoderImpl) GetSpotStreamPlaylist(spotID uint64) ([]byte, error) {
	return t.streams.Get(spotID)
}

func (t *transcoderImpl) Close() {
	close(t.queue)
}
