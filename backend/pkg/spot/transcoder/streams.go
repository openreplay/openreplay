package transcoder

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"time"

	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/objectstorage"
)

var (
	// DASH manifest patterns for segment URLs
	dashInitSegmentRe  = regexp.MustCompile(`sourceURL="([^"]+\.m4s)"`)
	dashMediaSegmentRe = regexp.MustCompile(`media="([^"]+\.m4s)"`)
)

type Streams interface {
	Add(spotID uint64, originalStream string) error
	Get(spotID uint64) ([]byte, error)
}

type streamsImpl struct {
	log     logger.Logger
	conn    pool.Pool
	storage objectstorage.ObjectStorage
}

func (s *streamsImpl) Add(spotID uint64, originalStream string) error {
	var modifiedContent string
	var err error

	// Detect format: DASH (MPD) or HLS (m3u8)
	if s.isDASH(originalStream) {
		modifiedContent, err = s.generateDASHWithPresignedURLs(spotID, originalStream)
	} else {
		modifiedContent, err = s.generateHLSWithPresignedURLs(spotID, originalStream)
	}
	if err != nil {
		return err
	}

	now := time.Now()
	sql := `INSERT INTO spots.streams (spot_id, original_playlist, modified_playlist, created_at, expired_at)
		VALUES ($1, $2, $3, $4, $5) ON CONFLICT (spot_id) DO UPDATE SET original_playlist = $2, modified_playlist = $3,
		created_at = $4, expired_at = $5`
	if err := s.conn.Exec(sql, spotID, originalStream, modifiedContent, now, now.Add(10*time.Minute)); err != nil {
		fmt.Println("Error inserting playlist to DB:", err)
		return err
	}
	return nil
}

// isDASH checks if the stream content is a DASH manifest (MPD) or HLS playlist (m3u8)
func (s *streamsImpl) isDASH(content string) bool {
	return strings.Contains(content, "<?xml") || strings.Contains(content, "<MPD")
}

// generateHLSWithPresignedURLs replaces HLS chunk paths with pre-signed URLs
func (s *streamsImpl) generateHLSWithPresignedURLs(spotID uint64, originalStream string) (string, error) {
	lines := strings.Split(originalStream, "\n")
	for i, line := range lines {
		if strings.HasPrefix(line, "index") && strings.HasSuffix(line, ".ts") {
			key := fmt.Sprintf("%d/%s", spotID, line)
			presignedURL, err := s.storage.GetPreSignedDownloadUrl(key)
			if err != nil {
				return "", fmt.Errorf("error generating pre-signed URL: %w", err)
			}
			lines[i] = presignedURL
		}
	}
	return strings.Join(lines, "\n"), nil
}

// generateDASHWithPresignedURLs replaces DASH segment paths with pre-signed URLs
// Handles both init segments (sourceURL attribute) and media chunks (media attribute)
func (s *streamsImpl) generateDASHWithPresignedURLs(spotID uint64, originalStream string) (string, error) {
	result := originalStream
	var lastErr error

	// Replace init segments: sourceURL="init-stream0.m4s"
	result = dashInitSegmentRe.ReplaceAllStringFunc(result, func(match string) string {
		submatch := dashInitSegmentRe.FindStringSubmatch(match)
		if len(submatch) < 2 {
			return match
		}
		segmentPath := submatch[1]
		key := fmt.Sprintf("%d/%s", spotID, segmentPath)
		presignedURL, err := s.storage.GetPreSignedDownloadUrl(key)
		if err != nil {
			lastErr = fmt.Errorf("error generating pre-signed URL for init segment %s: %w", segmentPath, err)
			return match
		}
		return fmt.Sprintf(`sourceURL="%s"`, presignedURL)
	})
	if lastErr != nil {
		return "", lastErr
	}

	// Replace media chunks: media="chunk-stream0-00001.m4s"
	result = dashMediaSegmentRe.ReplaceAllStringFunc(result, func(match string) string {
		submatch := dashMediaSegmentRe.FindStringSubmatch(match)
		if len(submatch) < 2 {
			return match
		}
		segmentPath := submatch[1]
		key := fmt.Sprintf("%d/%s", spotID, segmentPath)
		presignedURL, err := s.storage.GetPreSignedDownloadUrl(key)
		if err != nil {
			lastErr = fmt.Errorf("error generating pre-signed URL for chunk %s: %w", segmentPath, err)
			return match
		}
		return fmt.Sprintf(`media="%s"`, presignedURL)
	})
	if lastErr != nil {
		return "", lastErr
	}

	return result, nil
}

func (s *streamsImpl) Get(spotID uint64) ([]byte, error) {
	// Get modified playlist from DB
	sql := `
	SELECT
    	CASE
        	WHEN expired_at > $2 THEN modified_playlist
        	ELSE original_playlist
        	END AS playlist,
    	CASE
        	WHEN expired_at > $2 THEN 'modified'
        	ELSE 'original'
        	END AS playlist_type
	FROM spots.streams
    WHERE spot_id = $1`
	var playlist, flag string
	if err := s.conn.QueryRow(sql, spotID, time.Now()).Scan(&playlist, &flag); err != nil {
		s.log.Error(context.Background(), "Error getting spot stream playlist: %v", err)
		return []byte(""), err
	}
	if flag == "modified" {
		return []byte(playlist), nil
	}

	// Have to generate a new modified playlist with updated pre-signed URLs for chunks
	var modifiedPlaylist string
	var err error

	if s.isDASH(playlist) {
		modifiedPlaylist, err = s.generateDASHWithPresignedURLs(spotID, playlist)
	} else {
		modifiedPlaylist, err = s.generateHLSWithPresignedURLs(spotID, playlist)
	}
	if err != nil {
		s.log.Error(context.Background(), "Error generating pre-signed URLs: %v", err)
		return []byte(""), err
	}

	// Save modified playlist to DB
	sql = `UPDATE spots.streams SET modified_playlist = $1, expired_at = $2 WHERE spot_id = $3`
	if err := s.conn.Exec(sql, modifiedPlaylist, time.Now().Add(10*time.Minute), spotID); err != nil {
		s.log.Warn(context.Background(), "Error updating modified playlist: %v", err)
	}
	return []byte(modifiedPlaylist), nil
}

func NewStreams(log logger.Logger, conn pool.Pool, storage objectstorage.ObjectStorage) Streams {
	return &streamsImpl{
		log:     log,
		conn:    conn,
		storage: storage,
	}
}
