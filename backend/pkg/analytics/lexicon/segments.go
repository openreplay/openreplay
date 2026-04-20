package lexicon

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v4"

	analyticsModel "openreplay/backend/pkg/analytics/model"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
)

var ErrSegmentNotFound = errors.New("segment not found")

type Segments interface {
	Get(ctx context.Context, projectID uint32, searchID string) (*analyticsModel.SavedSearch, error)
}

type segmentsImpl struct {
	log    logger.Logger
	pgconn pool.Pool
}

func NewSegments(log logger.Logger, conn pool.Pool) Segments {
	return &segmentsImpl{log: log, pgconn: conn}
}

func (s *segmentsImpl) Get(ctx context.Context, projectID uint32, searchID string) (*analyticsModel.SavedSearch, error) {
	const query = `
		SELECT search_data
		FROM public.saved_searches
		WHERE search_id = $1
		  AND project_id = $2
		  AND deleted_at IS NULL
		  AND (expires_at IS NULL OR expires_at > NOW())
	`
	var dataJSON []byte
	err := s.pgconn.QueryRow(query, searchID, projectID).Scan(&dataJSON)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrSegmentNotFound
		}
		s.log.Error(ctx, "get segment %s: %v", searchID, err)
		return nil, fmt.Errorf("get segment: %w", err)
	}

	segment := &analyticsModel.SavedSearch{SearchID: searchID, ProjectID: int(projectID)}
	if len(dataJSON) > 0 {
		if err := json.Unmarshal(dataJSON, &segment.Data); err != nil {
			return nil, fmt.Errorf("unmarshal segment data: %w", err)
		}
	}
	return segment, nil
}
