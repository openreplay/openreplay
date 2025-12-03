package transcoder

import (
	"context"
	"fmt"
	"strings"
	"time"

	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/objectstorage"
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
	lines := strings.Split(originalStream, "\n")

	// Replace indexN.ts with pre-signed URLs
	for i, line := range lines {
		if strings.HasPrefix(line, "index") && strings.HasSuffix(line, ".ts") {
			key := fmt.Sprintf("%d/%s", spotID, line)
			presignedURL, err := s.storage.GetPreSignedDownloadUrl(key)
			if err != nil {
				fmt.Println("Error generating pre-signed URL:", err)
				return err
			}
			lines[i] = presignedURL
		}
	}

	modifiedContent := strings.Join(lines, "\n")
	now := time.Now()
	// Insert playlist to DB
	sql := `INSERT INTO spots.streams (spot_id, original_playlist, modified_playlist, created_at, expired_at) 
		VALUES ($1, $2, $3, $4, $5) ON CONFLICT (spot_id) DO UPDATE SET original_playlist = $2, modified_playlist = $3, 
		created_at = $4, expired_at = $5`
	if err := s.conn.Exec(sql, spotID, originalStream, modifiedContent, now, now.Add(10*time.Minute)); err != nil {
		fmt.Println("Error inserting playlist to DB:", err)
		return err
	}
	return nil
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
	lines := strings.Split(playlist, "\n")
	for i, line := range lines {
		if strings.HasPrefix(line, "index") && strings.HasSuffix(line, ".ts") {
			key := fmt.Sprintf("%d/%s", spotID, line)
			presignedURL, err := s.storage.GetPreSignedDownloadUrl(key)
			if err != nil {
				s.log.Error(context.Background(), "Error generating pre-signed URL: %v", err)
				return []byte(""), err
			}
			lines[i] = presignedURL
		}
	}
	modifiedPlaylist := strings.Join(lines, "\n")

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
