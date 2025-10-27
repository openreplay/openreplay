package canvas

import (
	"context"
	"errors"
	"fmt"

	"openreplay/backend/pkg/db/postgres"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/metrics/database"
)

type canvasesImpl struct {
	log    logger.Logger
	pgConn pool.Pool
	bulk   postgres.Bulk
}

type Canvases interface {
	Add(sessionID uint64, canvasID string, timestamp uint64) error
	Get(sessionID uint64) ([]string, error)
	Commit() error
}

func New(log logger.Logger, pgConn pool.Pool, dbMetrics database.Database) (Canvases, error) {
	switch {
	case log == nil:
		return nil, errors.New("logger must not be nil")
	case pgConn == nil:
		return nil, errors.New("pgConn must not be nil")
	case dbMetrics == nil:
		return nil, errors.New("dbMetrics must not be nil")
	}
	webCanvasNodes, err := postgres.NewBulk(pgConn, dbMetrics,
		"events.canvas_recordings",
		"(session_id, recording_id, timestamp)",
		"($%d, $%d, $%d)",
		3, postgres.BULK_SIZE)
	if err != nil {
		log.Fatal(context.Background(), "can't create webCanvasNodes bulk: %s", err)
	}
	return &canvasesImpl{
		log:    log,
		pgConn: pgConn,
		bulk:   webCanvasNodes,
	}, nil
}

func (c *canvasesImpl) Add(sessionID uint64, canvasID string, timestamp uint64) error {
	if err := c.bulk.Append(sessionID, fmt.Sprintf("%d_%s", timestamp, canvasID), timestamp); err != nil {
		sessCtx := context.WithValue(context.Background(), "sessionID", sessionID)
		c.log.Error(sessCtx, "insert canvas node in bulk err: %s", err)
	}
	return nil
}

func (c *canvasesImpl) Get(sessionID uint64) ([]string, error) {
	sql := `SELECT recording_id
            FROM events.canvas_recordings
            WHERE session_id = $1
            ORDER BY timestamp;`
	rows, err := c.pgConn.Query(sql, sessionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	recIDs := make([]string, 0, 16)
	for rows.Next() {
		var recordingID string
		if err := rows.Scan(&recordingID); err != nil {
			return nil, err
		}
		recIDs = append(recIDs, recordingID)
	}
	return recIDs, nil
}

func (c *canvasesImpl) Commit() error {
	return c.bulk.Send()
}
