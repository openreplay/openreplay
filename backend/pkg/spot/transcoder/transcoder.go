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
	spotMetrics "openreplay/backend/pkg/metrics/spot"
	"openreplay/backend/pkg/objectstorage"
	workers "openreplay/backend/pkg/pool"
	"openreplay/backend/pkg/spot/service"
)

type Transcoder interface {
	Process(spot *service.Spot) error
	GetSpotStreamPlaylist(spotID uint64) ([]byte, error)
	Close()
}

type transcoderImpl struct {
	cfg              *spot.Config
	log              logger.Logger
	close            chan interface{}
	objStorage       objectstorage.ObjectStorage
	conn             pool.Pool
	tasks            Tasks
	streams          Streams
	spots            service.Spots
	prepareWorkers   workers.WorkerPool
	transcodeWorkers workers.WorkerPool
	metrics          spotMetrics.Spot
}

func NewTranscoder(cfg *spot.Config, log logger.Logger, objStorage objectstorage.ObjectStorage, conn pool.Pool, spots service.Spots, metrics spotMetrics.Spot) Transcoder {
	tnsc := &transcoderImpl{
		cfg:        cfg,
		log:        log,
		close:      make(chan interface{}, 1),
		objStorage: objStorage,
		conn:       conn,
		tasks:      NewTasks(conn),
		streams:    NewStreams(log, conn, objStorage),
		spots:      spots,
		metrics:    metrics,
	}
	tnsc.prepareWorkers = workers.NewPool(2, 4, tnsc.prepare)
	tnsc.transcodeWorkers = workers.NewPool(2, 4, tnsc.transcode)
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
				} else {
					t.log.Error(context.Background(), "Error getting task: %v", err)
				}
				continue
			}
			t.process(task)
		}
	}
}

func (t *transcoderImpl) failedTask(task *Task, err error) {
	t.log.Error(context.Background(), "Task failed: %v", err)
	if err := t.tasks.Failed(task, err); err != nil {
		t.log.Error(context.Background(), "Error marking task as failed: %v", err)
	}
	if err := os.RemoveAll(task.Path); err != nil {
		t.log.Error(context.Background(), "Error removing directory: %v", err)
	}
}

func (t *transcoderImpl) doneTask(task *Task) {
	if err := t.spots.SetStatus(task.SpotID, "processed"); err != nil {
		t.log.Error(context.Background(), "Error updating spot status: %v", err)
	}
	if err := t.tasks.Done(task); err != nil {
		t.log.Error(context.Background(), "Error marking task as done: %v", err)
	}
	if err := os.RemoveAll(task.Path); err != nil {
		t.log.Error(context.Background(), "Error removing directory: %v", err)
	}
}

func (t *transcoderImpl) process(task *Task) {
	t.metrics.IncreaseVideosTotal()
	t.log.Info(context.Background(), "Processing spot %s", task.SpotID)

	// Prepare path for spot video
	path := t.cfg.FSDir + "/"
	if t.cfg.SpotsDir != "" {
		path += t.cfg.SpotsDir + "/"
	}
	task.Path = path + strconv.FormatUint(task.SpotID, 10) + "/"

	t.prepareWorkers.Submit(task)
}

// Download original video, crop if needed (and upload cropped).
func (t *transcoderImpl) prepare(payload interface{}) {
	task := payload.(*Task)

	// Download video from S3
	if err := t.downloadSpotVideo(task.SpotID, task.Path); err != nil {
		t.failedTask(task, fmt.Errorf("can't download video, spot: %d, err: %s", task.SpotID, err.Error()))
		return
	}

	if task.HasToTrim() {
		if err := t.cropSpotVideo(task.SpotID, task.Crop, task.Path); err != nil {
			t.failedTask(task, fmt.Errorf("can't crop video, spot: %d, err: %s", task.SpotID, err.Error()))
			return
		}
	}

	if !task.HasToTranscode() {
		t.log.Info(context.Background(), "Spot video %d is too short for transcoding", task.SpotID)
		t.doneTask(task)
	} else {
		t.transcodeWorkers.Submit(task)
	}
}

// Transcode video, upload to S3, save playlist to DB, delete local files.
func (t *transcoderImpl) transcode(payload interface{}) {
	task := payload.(*Task)

	// Transcode spot video to HLS format
	streamPlaylist, err := t.transcodeSpotVideo(task.SpotID, task.Path)
	if err != nil {
		t.failedTask(task, fmt.Errorf("can't transcode video, spot: %d, err: %s", task.SpotID, err.Error()))
		return
	}

	// Save stream playlist to DB
	if err := t.streams.Add(task.SpotID, streamPlaylist); err != nil {
		t.failedTask(task, fmt.Errorf("can't insert playlist to DB, spot: %d, err: %s", task.SpotID, err.Error()))
		return
	}

	t.doneTask(task)

	t.log.Info(context.Background(), "Transcoded spot %d, have to upload chunks to S3", task.SpotID)
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
		t.metrics.RecordOriginalVideoSize(float64(fileInfo.Size()))
	}
	originVideo.Close()

	t.metrics.RecordOriginalVideoDownloadDuration(time.Since(start).Seconds())

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
	t.metrics.IncreaseVideosCropped()
	t.metrics.RecordCroppingDuration(time.Since(start).Seconds())

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
		t.metrics.RecordCroppedVideoSize(float64(fileInfo.Size()))
	}

	err = t.objStorage.Upload(video, fmt.Sprintf("%d/video.webm", spotID), "video/webm", objectstorage.NoContentEncoding, objectstorage.NoCompression)
	if err != nil {
		return fmt.Errorf("failed to upload cropped video: %v", err)
	}

	t.metrics.RecordCroppedVideoUploadDuration(time.Since(start).Seconds())

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
	t.metrics.IncreaseVideosTranscoded()
	t.metrics.RecordTranscodingDuration(time.Since(start).Seconds())
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
		err = t.objStorage.Upload(chunkFile, key, "video/mp2t", objectstorage.NoContentEncoding, objectstorage.NoCompression)
		if err != nil {
			fmt.Println("Error uploading file:", err)
			return "", err
		}
	}
	t.metrics.RecordTranscodedVideoUploadDuration(time.Since(start).Seconds())

	t.log.Info(context.Background(), "Uploaded chunks for spot %d in %v", spotID, time.Since(start).Seconds())
	return strings.Join(lines, "\n"), nil
}

func (t *transcoderImpl) GetSpotStreamPlaylist(spotID uint64) ([]byte, error) {
	return t.streams.Get(spotID)
}

func (t *transcoderImpl) Wait() {
	t.prepareWorkers.Pause()
	t.transcodeWorkers.Pause()
}

func (t *transcoderImpl) Close() {
	t.close <- nil
	t.prepareWorkers.Stop()
	t.transcodeWorkers.Stop()
}
