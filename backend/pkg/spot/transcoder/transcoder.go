package transcoder

import (
	"bufio"
	"bytes"
	"context"
	"errors"
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
	Process(spot *service.Spot) error
	GetSpotStreamPlaylist(spotID uint64) ([]byte, error)
	Close()
}

type transcoderImpl struct {
	cfg        *spot.Config
	log        logger.Logger
	close      chan interface{}
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
		close:      make(chan interface{}, 1),
		objStorage: objStorage,
		conn:       conn,
		tasks:      NewTasks(conn),
		streams:    NewStreams(log, conn, objStorage),
		spots:      spots,
	}
	go tnsc.mainLoop()
	return tnsc
}

func (t *transcoderImpl) Process(spot *service.Spot) error {
	if spot.Crop == nil && spot.Duration < t.cfg.MinimumStreamDuration {
		// Skip this spot and set processed status
		t.log.Info(context.Background(), "Spot video %+v is too short for transcoding and without crop values", spot)
		if err := t.spots.SetStatus(spot.ID, "processed"); err != nil {
			t.log.Error(context.Background(), "Error updating spot status: %v", err)
		}
		return nil
	}
	return t.tasks.Add(spot.ID, spot.Crop, spot.Duration)
}

func (t *transcoderImpl) mainLoop() {
	for {
		select {
		case closeEvent := <-t.close:
			t.log.Info(context.Background(), "Transcoder is closing: %v", closeEvent)
			return
		default:
			task, err := t.tasks.Get()
			if err != nil {
				if errors.Is(err, NoTasksError{}) {
					time.Sleep(1 * time.Second)
					continue
				}
				t.log.Error(context.Background(), "Error getting task: %v", err)
				continue
			}
			start := time.Now()
			if proccessingError := t.process(task); err != nil {
				if err := t.tasks.Failed(task, proccessingError); err != nil {
					t.log.Error(context.Background(), "Error marking task as failed: %v", err)
				}
			} else {
				if err := t.tasks.Done(task); err != nil {
					t.log.Error(context.Background(), "Error marking task as done: %v", err)
				}
			}
			t.log.Info(context.Background(), "total time for transcoding spot %d - %v sec", task.SpotID, time.Since(start).Seconds())
		}
	}
}

func (t *transcoderImpl) process(task *Task) error {
	metrics.IncreaseVideosTotal()
	spotID := task.SpotID
	t.log.Info(context.Background(), "Processing spot %s", spotID)

	// Prepare path for spot video
	path := t.cfg.FSDir + "/"
	if t.cfg.SpotsDir != "" {
		path += t.cfg.SpotsDir + "/"
	}
	path += strconv.FormatUint(spotID, 10) + "/"

	defer func() {
		if err := os.RemoveAll(path); err != nil {
			t.log.Error(context.Background(), "Error removing directory: %v", err)
		}
	}()

	// Download video from S3
	if err := t.downloadSpotVideo(spotID, path); err != nil {
		return fmt.Errorf("can't download video, spot: %d, err: %s", task.SpotID, err.Error())
	}

	if task.HasToTrim() {
		if err := t.cropSpotVideo(spotID, task.Crop, path); err != nil {
			return fmt.Errorf("can't crop video, spot: %d, err: %s", task.SpotID, err.Error())
		}
	}

	if !task.HasToTranscode() {
		t.log.Info(context.Background(), "Spot video %d is too short for transcoding", spotID)
		return nil
	}

	// Transcode spot video to HLS format
	streamPlaylist, err := t.transcodeSpotVideo(spotID, path)
	if err != nil {
		return fmt.Errorf("can't transcode video, spot: %d, err: %s", task.SpotID, err.Error())
	}

	// Save stream playlist to DB
	if err := t.streams.Add(spotID, streamPlaylist); err != nil {
		return fmt.Errorf("can't insert playlist to DB, spot: %d, err: %s", task.SpotID, err.Error())
	}

	if err := t.spots.SetStatus(spotID, "processed"); err != nil {
		t.log.Error(context.Background(), "Error updating spot status: %v", err)
	}

	t.log.Info(context.Background(), "Transcoded spot %d, have to upload chunks to S3", spotID)
	return nil
}

func (t *transcoderImpl) downloadSpotVideo(spotID uint64, path string) error {
	start := time.Now()

	// Ensure the directory exists
	if err := os.MkdirAll(path, 0755); err != nil {
		t.log.Fatal(context.Background(), "Error creating directories: %v", err)
	}

	video, err := t.objStorage.Get(fmt.Sprintf("%d/video.webm", spotID))
	if err != nil {
		return err
	}
	defer video.Close()

	// Save file to disk
	originVideo, err := os.Create(path + "origin.webm")
	if err != nil {
		return fmt.Errorf("can't create file: %s", err.Error())
	}
	if _, err := io.Copy(originVideo, video); err != nil {
		return fmt.Errorf("can't copy file: %s", err.Error())
	}
	if fileInfo, err := originVideo.Stat(); err != nil {
		t.log.Error(context.Background(), "Failed to get file info: %v", err)
	} else {
		metrics.RecordOriginalVideoSize(float64(fileInfo.Size()))
	}
	originVideo.Close()

	metrics.RecordOriginalVideoDownloadDuration(time.Since(start).Seconds())

	t.log.Info(context.Background(), "Saved origin video to disk, spot: %d in %v sec", spotID, time.Since(start).Seconds())
	return nil
}

func (t *transcoderImpl) cropSpotVideo(spotID uint64, crop []int, path string) error {
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
		return fmt.Errorf("failed to execute command: %v, stderr: %v", err, stderr.String())
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
		return fmt.Errorf("failed to open cropped video: %v", err)
	}
	defer video.Close()

	if fileInfo, err := video.Stat(); err != nil {
		t.log.Error(context.Background(), "Failed to get file info: %v", err)
	} else {
		metrics.RecordCroppedVideoSize(float64(fileInfo.Size()))
	}

	err = t.objStorage.Upload(video, fmt.Sprintf("%d/video.webm", spotID), "video/webm", objectstorage.NoCompression)
	if err != nil {
		return fmt.Errorf("failed to upload cropped video: %v", err)
	}

	metrics.RecordCroppedVideoUploadDuration(time.Since(start).Seconds())

	t.log.Info(context.Background(), "Uploaded cropped spot %d in %v", spotID, time.Since(start).Seconds())
	return nil
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
	t.close <- nil
}
