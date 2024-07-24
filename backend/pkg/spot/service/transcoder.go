package service

import (
	"bufio"
	"bytes"
	"context"
	"fmt"
	"io"
	"openreplay/backend/internal/config/spot"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/objectstorage"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"time"
)

type Transcoder interface {
	Transcode(spot *Spot) error
	GetSpotStreamPlaylist(spotID uint64) ([]byte, error)
	Close()
}

type transcoderImpl struct {
	cfg        *spot.Config
	log        logger.Logger
	queue      chan *Spot // in-memory queue for transcoding
	objStorage objectstorage.ObjectStorage
	conn       pool.Pool
}

func NewTranscoder(cfg *spot.Config, log logger.Logger, objStorage objectstorage.ObjectStorage, conn pool.Pool) Transcoder {
	tnsc := &transcoderImpl{
		cfg:        cfg,
		log:        log,
		queue:      make(chan *Spot, 100),
		objStorage: objStorage,
		conn:       conn,
	}
	go tnsc.mainLoop()
	return tnsc
}

func (t *transcoderImpl) Transcode(spot *Spot) error {
	t.queue <- spot
	return nil
}

func (t *transcoderImpl) mainLoop() {
	for {
		select {
		case spot := <-t.queue:
			t.transcode(spot)
		}
	}
}

func (t *transcoderImpl) transcode(spot *Spot) {
	if spot.Crop == nil && spot.Duration < 15000 {
		t.log.Info(context.Background(), "Spot video %+v is too short for transcoding and without crop values", spot)
		return
	}
	spotID := spot.ID
	t.log.Info(context.Background(), "Processing spot %s", spotID)

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

	if spot.Crop != nil && len(spot.Crop) == 2 {
		// Crop video
		// ffmpeg -i input.webm -ss 5 -to 20 -c copy output.webm
		crop := spot.Crop
		start := time.Now()

		cmd := exec.Command("ffmpeg", "-i", path+"origin.webm",
			"-ss", fmt.Sprintf("%.2f", float64(crop[0])/1000.0),
			"-to", fmt.Sprintf("%.2f", float64(crop[1])/1000.0),
			"-c", "copy", path+"cropped.webm")
		var stdout, stderr bytes.Buffer
		cmd.Stdout = &stdout
		cmd.Stderr = &stderr

		err = cmd.Run()
		if err != nil {
			t.log.Error(context.Background(), "Failed to execute command: %v, stderr: %v", err, stderr.String())
			return
		}
		t.log.Info(context.Background(), "Cropped spot %d in %v", spotID, time.Since(start))

		// mv cropped.webm origin.webm
		err = os.Rename(path+"cropped.webm", path+"origin.webm")
	}

	if spot.Duration < 15000 {
		t.log.Info(context.Background(), "Spot video %d is too short for transcoding", spotID)
		return
	}

	// Transcode video tp HLS format
	// ffmpeg -i origin.webm -c:v copy -c:a aac -b:a 128k -start_number 0 -hls_time 10 -hls_list_size 0 -f hls index.m3u8
	start := time.Now()
	videoPath := path + "origin.webm"
	playlistPath := path + "index.m3u8"
	cmd := exec.Command("ffmpeg", "-i", videoPath, "-c:v", "copy", "-c:a", "aac", "-b:a", "128k",
		"-start_number", "0", "-hls_time", "10", "-hls_list_size", "0", "-f", "hls", playlistPath)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err = cmd.Run()
	if err != nil {
		t.log.Error(context.Background(), "Failed to execute command: %v, stderr: %v", err, stderr.String())
		return
	}
	t.log.Info(context.Background(), "Transcoded spot %d in %v", spotID, time.Since(start))

	// Read the M3U8 file
	file, err := os.Open(playlistPath)
	if err != nil {
		fmt.Println("Error opening file:", err)
		return
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
		return
	}

	// Insert stream chunks to s3
	for _, chunk := range chunks {
		chunkPath := path + chunk
		chunkFile, err := os.Open(chunkPath)
		if err != nil {
			fmt.Println("Error opening file:", err)
			return
		}
		defer chunkFile.Close()

		key := fmt.Sprintf("%d/%s", spotID, chunk)
		err = t.objStorage.Upload(chunkFile, key, "video/mp2t", objectstorage.NoCompression)
		if err != nil {
			fmt.Println("Error uploading file:", err)
			return
		}
	}

	// Replace indexN.ts with pre-signed URLs
	for i, line := range lines {
		if strings.HasPrefix(line, "index") && strings.HasSuffix(line, ".ts") {
			key := fmt.Sprintf("%d/%s", spotID, line)
			presignedURL, err := t.objStorage.GetPreSignedDownloadUrl(key)
			if err != nil {
				fmt.Println("Error generating pre-signed URL:", err)
				return
			}
			lines[i] = presignedURL
		}
	}

	originalContent := strings.Join(originalLines, "\n")
	modifiedContent := strings.Join(lines, "\n")
	// Insert playlist to DB
	sql := `INSERT INTO spots_streams (spot_id, original_playlist, modified_playlist, created_at) VALUES ($1, $2, $3, $4) ON CONFLICT (spot_id) DO UPDATE SET original_playlist = $2, modified_playlist = $3, created_at = $4`
	if err := t.conn.Exec(sql, spotID, originalContent, modifiedContent, time.Now()); err != nil {
		fmt.Println("Error inserting playlist to DB:", err)
		return
	}

	t.log.Info(context.Background(), "Transcoded spot %d, have to upload chunks to S3", spotID)
}

func (t *transcoderImpl) GetSpotStreamPlaylist(spotID uint64) ([]byte, error) {
	// Get modified playlist from DB
	sql := `SELECT modified_playlist FROM spots_streams WHERE spot_id = $1`
	var playlist string
	if err := t.conn.QueryRow(sql, spotID).Scan(&playlist); err != nil {
		t.log.Error(context.Background(), "Error getting spot stream playlist: %v", err)
		return []byte(""), err
	}
	return []byte(playlist), nil
}

func (t *transcoderImpl) Close() {
	close(t.queue)
}
