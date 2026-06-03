package admin

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/jackc/pgx/v4"

	"openreplay/backend/pkg/cache"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
)

var (
	ErrTagNotFound      = errors.New("tag not found")
	ErrNoFieldsToUpdate = errors.New("no fields to update")
)

// TagsForFiltersItem is a lightweight projection used by the filters catalog.
type TagsForFiltersItem struct {
	TagID           int
	Name            string
	Selector        string
	IgnoreClickRage bool
	IgnoreDeadClick bool
	Location        *string
}

type TagService interface {
	Create(ctx context.Context, projectID uint32, req *CreateTagRequest) (int, error)
	List(ctx context.Context, projectID uint32, limit, offset int) (*ListTagsResponse, error)
	Update(ctx context.Context, projectID uint32, tagID int, req *UpdateTagRequest) error
	Delete(ctx context.Context, projectID uint32, tagID int) error
	ListForFilters(projectID int) ([]TagsForFiltersItem, error)
}

type tagServiceImpl struct {
	log        logger.Logger
	pgconn     pool.Pool
	chconn     clickhouse.Conn
	statsCache cache.Cache
}

func NewTagService(log logger.Logger, pgconn pool.Pool, chconn clickhouse.Conn) TagService {
	return &tagServiceImpl{
		log:        log,
		pgconn:     pgconn,
		chconn:     chconn,
		statsCache: cache.New(time.Minute*30, time.Hour),
	}
}

func (s *tagServiceImpl) Create(ctx context.Context, projectID uint32, req *CreateTagRequest) (int, error) {
	const query = `
		INSERT INTO public.tags (project_id, name, selector, ignore_click_rage, ignore_dead_click, location)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING tag_id
	`

	name := strings.TrimSpace(req.Name)
	var tagID int
	err := s.pgconn.QueryRow(query, projectID, name, req.Selector, req.IgnoreClickRage, req.IgnoreDeadClick, req.Location).Scan(&tagID)
	if err != nil {
		s.log.Error(ctx, "failed to create tag: %s", err)
		return 0, fmt.Errorf("create tag: %s", err)
	}
	return tagID, nil
}

func (s *tagServiceImpl) List(ctx context.Context, projectID uint32, limit, offset int) (*ListTagsResponse, error) {
	const query = `
		SELECT tag_id, name, selector, ignore_click_rage, ignore_dead_click, location,
		       COUNT(*) OVER() AS total
		FROM public.tags
		WHERE project_id = $1 AND deleted_at IS NULL
		ORDER BY name
		LIMIT $2 OFFSET $3
	`

	rows, err := s.pgconn.Query(query, projectID, limit, offset)
	if err != nil {
		s.log.Error(ctx, "failed to list tags: %s", err)
		return nil, fmt.Errorf("list tags: %s", err)
	}
	defer rows.Close()

	var total int
	tags := make([]TagResponse, 0)
	for rows.Next() {
		var t TagResponse
		if err := rows.Scan(&t.TagID, &t.Name, &t.Selector, &t.IgnoreClickRage, &t.IgnoreDeadClick, &t.Location, &total); err != nil {
			s.log.Error(ctx, "failed to scan tag row: %s", err)
			return nil, fmt.Errorf("scan tag: %s", err)
		}
		tags = append(tags, t)
	}
	if err := rows.Err(); err != nil {
		s.log.Error(ctx, "failed to iterate tag rows: %s", err)
		return nil, fmt.Errorf("iterate tags: %s", err)
	}

	statsMap := s.getTagStats(ctx, projectID)
	for i := range tags {
		if stats, ok := statsMap[tags[i].TagID]; ok {
			tags[i].Volume = stats.Volume
			tags[i].Users = stats.UniqueUsers
		}
	}

	return &ListTagsResponse{Tags: tags, Total: total}, nil
}

func (s *tagServiceImpl) getTagStats(ctx context.Context, projectID uint32) map[int]TagStats {
	cacheKey := fmt.Sprintf("tag_stats:%d", projectID)

	if cached, ok := s.statsCache.GetAndRefresh(cacheKey); ok {
		if statsMap, ok := cached.(map[int]TagStats); ok {
			return statsMap
		}
	}

	const query = `
		SELECT
			toInt64("$properties"."tag_id") AS tag_id,
			COUNT(*) AS volume,
			COUNT(DISTINCT distinct_id) AS unique_users
		FROM product_analytics.events
		WHERE project_id = $1
		  AND "$event_name" = 'TAG_TRIGGER'
		  AND created_at >= now() - INTERVAL 7 DAY
		GROUP BY tag_id
	`

	statsMap := make(map[int]TagStats)

	rows, err := s.chconn.Query(ctx, query, uint16(projectID))
	if err != nil {
		s.log.Error(ctx, "failed to query tag stats from clickhouse: %.200s", err)
		return statsMap
	}
	defer rows.Close()

	for rows.Next() {
		var tagID int64
		var volume, uniqueUsers uint64
		if err := rows.Scan(&tagID, &volume, &uniqueUsers); err != nil {
			s.log.Error(ctx, "failed to scan tag stats row: %.200s", err)
			continue
		}
		statsMap[int(tagID)] = TagStats{
			Volume:      int64(volume),
			UniqueUsers: int64(uniqueUsers),
		}
	}
	if err := rows.Err(); err != nil {
		s.log.Error(ctx, "failed to iterate tag stats rows: %.200s", err)
	}

	s.statsCache.Set(cacheKey, statsMap)
	return statsMap
}

func (s *tagServiceImpl) Update(ctx context.Context, projectID uint32, tagID int, req *UpdateTagRequest) error {
	setClauses := make([]string, 0, 2)
	params := make([]interface{}, 0, 4)
	idx := 1

	if req.Name != nil {
		name := strings.TrimSpace(*req.Name)
		setClauses = append(setClauses, fmt.Sprintf("name = $%d", idx))
		params = append(params, name)
		idx++
	}
	if req.Location != nil {
		setClauses = append(setClauses, fmt.Sprintf("location = $%d", idx))
		params = append(params, *req.Location)
		idx++
	}

	if len(setClauses) == 0 {
		return ErrNoFieldsToUpdate
	}

	query := fmt.Sprintf(`
		UPDATE public.tags
		SET %s
		WHERE tag_id = $%d AND project_id = $%d AND deleted_at IS NULL
		RETURNING tag_id
	`, strings.Join(setClauses, ", "), idx, idx+1)
	params = append(params, tagID, projectID)

	var updatedID int
	if err := s.pgconn.QueryRow(query, params...).Scan(&updatedID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrTagNotFound
		}
		s.log.Error(ctx, "failed to update tag %d: %s", tagID, err)
		return fmt.Errorf("update tag: %s", err)
	}
	return nil
}

func (s *tagServiceImpl) Delete(ctx context.Context, projectID uint32, tagID int) error {
	const query = `
		UPDATE public.tags
		SET deleted_at = now() AT TIME ZONE 'utc'
		WHERE tag_id = $1 AND project_id = $2 AND deleted_at IS NULL
		RETURNING tag_id
	`

	var deletedID int
	if err := s.pgconn.QueryRow(query, tagID, projectID).Scan(&deletedID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrTagNotFound
		}
		s.log.Error(ctx, "failed to delete tag %d: %s", tagID, err)
		return fmt.Errorf("delete tag: %s", err)
	}
	return nil
}

func (s *tagServiceImpl) ListForFilters(projectID int) ([]TagsForFiltersItem, error) {
	const q = `
        SELECT tag_id, name, selector, ignore_click_rage, ignore_dead_click, location
        FROM public.tags
        WHERE project_id = $1 AND deleted_at IS NULL
        ORDER BY name`
	rows, err := s.pgconn.Query(q, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []TagsForFiltersItem
	for rows.Next() {
		var t TagsForFiltersItem
		if err := rows.Scan(&t.TagID, &t.Name, &t.Selector, &t.IgnoreClickRage, &t.IgnoreDeadClick, &t.Location); err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}
