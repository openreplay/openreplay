package admin

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"

	"openreplay/backend/pkg/db/postgres"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/projects"
)

const (
	recordedLookback = 4 * time.Hour
	recordedRecheck  = time.Hour
	metadataColumns  = `metadata_1, metadata_2, metadata_3, metadata_4, metadata_5,
		metadata_6, metadata_7, metadata_8, metadata_9, metadata_10`
)

type Service interface {
	List(ctx context.Context, tenantID uint64) ([]*ProjectListItem, error)
	Get(ctx context.Context, tenantID uint64, projectID uint32) (*ProjectDetails, error)
	Create(ctx context.Context, tenantID uint64, req *ProjectRequest) (*ProjectInfo, error)
	Update(ctx context.Context, tenantID uint64, projectID uint32, req *ProjectRequest) (*ProjectUpdated, error)
	Delete(ctx context.Context, tenantID uint64, projectID uint32) error
	GetCaptureRate(ctx context.Context, tenantID uint64, projectID uint32) (*CaptureRate, error)
	UpdateCaptureRate(ctx context.Context, tenantID uint64, projectID uint32, req *CaptureRateRequest) (*CaptureRate, error)
	GetGDPR(ctx context.Context, tenantID uint64, projectID uint32) (map[string]any, error)
	UpdateGDPR(ctx context.Context, tenantID uint64, projectID uint32, req *GDPRRequest) (map[string]any, error)
	ListMetadata(ctx context.Context, tenantID uint64, projectID uint32) ([]*MetadataKey, error)
	AddMetadata(ctx context.Context, tenantID uint64, projectID uint32, key string) (*MetadataKey, error)
	RenameMetadata(ctx context.Context, tenantID uint64, projectID uint32, index int, key string) (*MetadataKey, error)
	DeleteMetadata(ctx context.Context, tenantID uint64, projectID uint32, index int) ([]*MetadataKey, error)
}

type serviceImpl struct {
	log      logger.Logger
	pgconn   pool.Pool
	projects projects.Projects
}

func New(log logger.Logger, pgconn pool.Pool, projects projects.Projects) Service {
	return &serviceImpl{
		log:      log,
		pgconn:   pgconn,
		projects: projects,
	}
}

func projectArgs(tenantID uint64, projectID uint32) pgx.NamedArgs {
	return pgx.NamedArgs{"tenantId": tenantID, "projectId": projectID}
}

func notFound(err error) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrProjectNotFound
	}
	return err
}

func (s *serviceImpl) invalidate(projectID uint32, projectKey string, tenantID uint64) {
	s.projects.Invalidate(projectID, projectKey, int(tenantID))
}

func (s *serviceImpl) List(ctx context.Context, tenantID uint64) ([]*ProjectListItem, error) {
	now := time.Now().UnixMilli()
	rows, err := s.pgconn.Query(`
		SELECT projects.project_id, projects.name, projects.project_key, projects.save_request_payloads,
		       (EXTRACT(EPOCH FROM projects.created_at) * 1000)::BIGINT,
		       (EXTRACT(EPOCH FROM projects.sessions_last_check_at) * 1000)::BIGINT,
		       projects.first_recorded_session_at IS NOT NULL,
		       projects.sample_rate, projects.platform::text,
		       (SELECT COUNT(*)
		        FROM public.projects_conditions
		        WHERE projects_conditions.project_id = projects.project_id),
		       projects.gdpr,
		       COALESCE((EXTRACT(EPOCH FROM projects.first_recorded_session_at) * 1000)::BIGINT,
		                (SELECT MIN(sessions.start_ts)
		                 FROM public.sessions
		                 WHERE sessions.project_id = projects.project_id
		                   AND sessions.start_ts >= (EXTRACT(EPOCH FROM COALESCE(projects.sessions_last_check_at, projects.created_at)) * 1000)::BIGINT - @lookback
		                   AND sessions.start_ts <= @now))
		FROM public.projects
		WHERE projects.deleted_at IS NULL
		  AND `+tenantScope+`
		ORDER BY projects.name`,
		pgx.NamedArgs{"tenantId": tenantID, "now": now, "lookback": recordedLookback.Milliseconds()})
	if err != nil {
		return nil, fmt.Errorf("list projects: %s", err)
	}
	defer rows.Close()

	list := make([]*ProjectListItem, 0)
	var recheckIDs []int64
	var recheckFirst []*int64
	for rows.Next() {
		p := &ProjectListItem{}
		var lastCheckAt, firstRecorded *int64
		var hasFirstRecorded bool
		if err := rows.Scan(&p.ProjectID, &p.Name, &p.ProjectKey, &p.SaveRequestPayloads, &p.CreatedAt,
			&lastCheckAt, &hasFirstRecorded, &p.SampleRate, &p.Platform, &p.ConditionsCount, &p.GDPR,
			&firstRecorded); err != nil {
			return nil, fmt.Errorf("scan project: %s", err)
		}
		p.Recorded = firstRecorded != nil
		if !hasFirstRecorded && lastCheckAt != nil && now-*lastCheckAt > recordedRecheck.Milliseconds() {
			recheckIDs = append(recheckIDs, int64(p.ProjectID))
			recheckFirst = append(recheckFirst, firstRecorded)
		}
		list = append(list, p)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate projects: %s", err)
	}

	if len(recheckIDs) > 0 {
		if err := s.pgconn.Exec(`
			UPDATE public.projects
			SET sessions_last_check_at    = (now() AT TIME ZONE 'utc'),
			    first_recorded_session_at = to_timestamp(checks.first_recorded / 1000.0) AT TIME ZONE 'utc'
			FROM unnest(@projectIds::bigint[], @firstRecorded::bigint[]) AS checks(project_id, first_recorded)
			WHERE projects.project_id = checks.project_id`,
			pgx.NamedArgs{"projectIds": recheckIDs, "firstRecorded": recheckFirst}); err != nil {
			s.log.Warn(ctx, "failed to update projects recording check: %s", err)
		}
	}
	return list, nil
}

func (s *serviceImpl) getInfo(tenantID uint64, projectID uint32, withLastSession bool) (*ProjectDetails, error) {
	lastSession := `NULL::BIGINT`
	if withLastSession {
		lastSession = `(SELECT MAX(sessions.start_ts) FROM public.sessions WHERE sessions.project_id = projects.project_id)`
	}
	p := &ProjectDetails{}
	err := s.pgconn.QueryRow(`
		SELECT projects.project_id, projects.project_key, projects.name, projects.save_request_payloads,
		       projects.platform::text, projects.gdpr, `+lastSession+`
		FROM public.projects
		WHERE projects.project_id = @projectId
		  AND projects.deleted_at IS NULL
		  AND `+tenantScope,
		projectArgs(tenantID, projectID)).Scan(&p.ProjectID, &p.ProjectKey, &p.Name, &p.SaveRequestPayloads,
		&p.Platform, &p.GDPR, &p.LastRecordedSessionAt)
	if err != nil {
		return nil, notFound(err)
	}
	return p, nil
}

func (s *serviceImpl) Get(ctx context.Context, tenantID uint64, projectID uint32) (*ProjectDetails, error) {
	return s.getInfo(tenantID, projectID, true)
}

func (s *serviceImpl) nameExists(tenantID uint64, name string, excludeID uint32) (bool, error) {
	var exists bool
	err := s.pgconn.QueryRow(`
		SELECT EXISTS(SELECT 1
		              FROM public.projects
		              WHERE projects.deleted_at IS NULL
		                AND projects.name ILIKE @name ESCAPE '\'
		                AND projects.project_id != @projectId
		                AND `+tenantScope+`)`,
		pgx.NamedArgs{"tenantId": tenantID, "projectId": excludeID, "name": postgres.EscapeILIKE(name)}).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check project name: %s", err)
	}
	return exists, nil
}

func (s *serviceImpl) Create(ctx context.Context, tenantID uint64, req *ProjectRequest) (*ProjectInfo, error) {
	exists, err := s.nameExists(tenantID, req.Name, 0)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, ErrNameExists
	}
	var projectID uint32
	if err := s.pgconn.QueryRow(insertProject,
		pgx.NamedArgs{"tenantId": tenantID, "name": req.Name, "platform": req.Platform}).Scan(&projectID); err != nil {
		return nil, fmt.Errorf("create project: %s", err)
	}
	p, err := s.getInfo(tenantID, projectID, false)
	if err != nil {
		return nil, fmt.Errorf("get created project: %s", err)
	}
	return &p.ProjectInfo, nil
}

func (s *serviceImpl) Update(ctx context.Context, tenantID uint64, projectID uint32, req *ProjectRequest) (*ProjectUpdated, error) {
	exists, err := s.nameExists(tenantID, req.Name, projectID)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, ErrNameExists
	}
	var platform *string
	if req.Platform != "" {
		platform = &req.Platform
	}
	args := projectArgs(tenantID, projectID)
	args["name"] = req.Name
	args["platform"] = platform
	p := &ProjectUpdated{}
	var projectKey string
	err = s.pgconn.QueryRow(`
		UPDATE public.projects
		SET name     = @name,
		    platform = COALESCE(@platform::platform, projects.platform)
		WHERE projects.project_id = @projectId
		  AND projects.deleted_at IS NULL
		  AND `+tenantScope+`
		RETURNING projects.project_id, projects.name, projects.gdpr, projects.project_key`,
		args).Scan(&p.ProjectID, &p.Name, &p.GDPR, &projectKey)
	if err != nil {
		return nil, notFound(err)
	}
	s.invalidate(projectID, projectKey, tenantID)
	return p, nil
}

func (s *serviceImpl) Delete(ctx context.Context, tenantID uint64, projectID uint32) error {
	var projectKey string
	err := s.pgconn.QueryRow(`
		UPDATE public.projects
		SET deleted_at = (now() AT TIME ZONE 'utc'),
		    active     = FALSE
		WHERE projects.project_id = @projectId
		  AND projects.deleted_at IS NULL
		  AND `+tenantScope+`
		RETURNING projects.project_key`,
		projectArgs(tenantID, projectID)).Scan(&projectKey)
	if err != nil {
		return notFound(err)
	}
	s.invalidate(projectID, projectKey, tenantID)
	return nil
}

func (s *serviceImpl) GetCaptureRate(ctx context.Context, tenantID uint64, projectID uint32) (*CaptureRate, error) {
	c := &CaptureRate{}
	err := s.pgconn.QueryRow(`
		SELECT projects.sample_rate, projects.sample_rate = 100
		FROM public.projects
		WHERE projects.project_id = @projectId
		  AND projects.deleted_at IS NULL
		  AND `+tenantScope,
		projectArgs(tenantID, projectID)).Scan(&c.Rate, &c.CaptureAll)
	if err != nil {
		return nil, notFound(err)
	}
	return c, nil
}

func (s *serviceImpl) UpdateCaptureRate(ctx context.Context, tenantID uint64, projectID uint32, req *CaptureRateRequest) (*CaptureRate, error) {
	args := projectArgs(tenantID, projectID)
	args["sampleRate"] = req.SampleRate()
	c := &CaptureRate{}
	var projectKey string
	err := s.pgconn.QueryRow(`
		UPDATE public.projects
		SET sample_rate = @sampleRate
		WHERE projects.project_id = @projectId
		  AND projects.deleted_at IS NULL
		  AND `+tenantScope+`
		RETURNING projects.sample_rate, projects.sample_rate = 100, projects.project_key`,
		args).Scan(&c.Rate, &c.CaptureAll, &projectKey)
	if err != nil {
		return nil, notFound(err)
	}
	s.invalidate(projectID, projectKey, tenantID)
	return c, nil
}

func (s *serviceImpl) GetGDPR(ctx context.Context, tenantID uint64, projectID uint32) (map[string]any, error) {
	gdpr := make(map[string]any)
	err := s.pgconn.QueryRow(`
		SELECT projects.gdpr
		FROM public.projects
		WHERE projects.project_id = @projectId
		  AND projects.deleted_at IS NULL
		  AND `+tenantScope,
		projectArgs(tenantID, projectID)).Scan(&gdpr)
	if err != nil {
		return nil, notFound(err)
	}
	gdpr["projectId"] = projectID
	return gdpr, nil
}

func (s *serviceImpl) UpdateGDPR(ctx context.Context, tenantID uint64, projectID uint32, req *GDPRRequest) (map[string]any, error) {
	changes, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("marshal gdpr: %s", err)
	}
	args := projectArgs(tenantID, projectID)
	args["gdpr"] = string(changes)
	gdpr := make(map[string]any)
	err = s.pgconn.QueryRow(`
		UPDATE public.projects
		SET gdpr = projects.gdpr || @gdpr::jsonb
		WHERE projects.project_id = @projectId
		  AND projects.deleted_at IS NULL
		  AND `+tenantScope+`
		RETURNING projects.gdpr`,
		args).Scan(&gdpr)
	if err != nil {
		return nil, notFound(err)
	}
	gdpr["projectId"] = projectID
	return gdpr, nil
}

func metadataList(keys [maxMetadataKeys]*string) []*MetadataKey {
	list := make([]*MetadataKey, 0, maxMetadataKeys)
	for i, key := range keys {
		if key != nil {
			list = append(list, &MetadataKey{Key: *key, Index: i + 1})
		}
	}
	return list
}

func metadataKeyExists(keys [maxMetadataKeys]*string, key string, excludeIndex int) bool {
	for i, k := range keys {
		if k != nil && i+1 != excludeIndex && strings.EqualFold(*k, key) {
			return true
		}
	}
	return false
}

func scanMetadata(row pgx.Row, keys *[maxMetadataKeys]*string, extra ...any) error {
	dest := make([]any, 0, maxMetadataKeys+len(extra))
	for i := range keys {
		dest = append(dest, &keys[i])
	}
	return row.Scan(append(dest, extra...)...)
}

func (s *serviceImpl) ListMetadata(ctx context.Context, tenantID uint64, projectID uint32) ([]*MetadataKey, error) {
	var keys [maxMetadataKeys]*string
	err := scanMetadata(s.pgconn.QueryRow(`
		SELECT `+metadataColumns+`
		FROM public.projects
		WHERE projects.project_id = @projectId
		  AND projects.deleted_at IS NULL
		  AND `+tenantScope,
		projectArgs(tenantID, projectID)), &keys)
	if err != nil {
		return nil, notFound(err)
	}
	return metadataList(keys), nil
}

type metadataUpdate func(tx *pool.Tx, keys *[maxMetadataKeys]*string) error

func (s *serviceImpl) updateMetadata(tenantID uint64, projectID uint32, update metadataUpdate) (keys [maxMetadataKeys]*string, err error) {
	tx, err := s.pgconn.Begin()
	if err != nil {
		return keys, fmt.Errorf("begin tx: %s", err)
	}
	defer func() {
		if err != nil {
			if rbErr := tx.TxRollback(); rbErr != nil {
				s.log.Warn(context.Background(), "failed to rollback metadata update: %s", rbErr)
			}
		}
	}()

	var projectKey string
	if err = scanMetadata(tx.TxQueryRow(`
		SELECT `+metadataColumns+`, projects.project_key
		FROM public.projects
		WHERE projects.project_id = @projectId
		  AND projects.deleted_at IS NULL
		  AND `+tenantScope+`
		FOR UPDATE`,
		projectArgs(tenantID, projectID)), &keys, &projectKey); err != nil {
		err = notFound(err)
		return keys, err
	}
	if err = update(tx, &keys); err != nil {
		return keys, err
	}
	if err = tx.TxCommit(); err != nil {
		return keys, fmt.Errorf("commit metadata update: %s", err)
	}
	s.invalidate(projectID, projectKey, tenantID)
	return keys, nil
}

func setMetadataColumn(tx *pool.Tx, projectID uint32, index int, value *string) error {
	err := tx.TxExec(fmt.Sprintf(`UPDATE public.projects SET metadata_%d = @value WHERE project_id = @projectId`, index),
		pgx.NamedArgs{"projectId": projectID, "value": value})
	if err != nil {
		return fmt.Errorf("update metadata_%d: %s", index, err)
	}
	return nil
}

func (s *serviceImpl) AddMetadata(ctx context.Context, tenantID uint64, projectID uint32, key string) (*MetadataKey, error) {
	added := &MetadataKey{Key: key}
	_, err := s.updateMetadata(tenantID, projectID, func(tx *pool.Tx, keys *[maxMetadataKeys]*string) error {
		for i, k := range keys {
			if k == nil {
				added.Index = i + 1
				break
			}
		}
		if added.Index == 0 {
			return ErrMetadataLimit
		}
		if metadataKeyExists(*keys, key, 0) {
			return ErrNameExists
		}
		return setMetadataColumn(tx, projectID, added.Index, &key)
	})
	if err != nil {
		return nil, err
	}
	return added, nil
}

func (s *serviceImpl) RenameMetadata(ctx context.Context, tenantID uint64, projectID uint32, index int, key string) (*MetadataKey, error) {
	if !ValidMetadataIndex(index) {
		return nil, ErrMetadataNotFound
	}
	_, err := s.updateMetadata(tenantID, projectID, func(tx *pool.Tx, keys *[maxMetadataKeys]*string) error {
		current := keys[index-1]
		if current == nil {
			return ErrMetadataNotFound
		}
		if metadataKeyExists(*keys, key, index) {
			return ErrNameExists
		}
		if *current == key {
			return nil
		}
		if err := setMetadataColumn(tx, projectID, index, &key); err != nil {
			return err
		}
		if err := tx.TxExec(`
			UPDATE public.projects_conditions
			SET filters = (SELECT jsonb_agg(CASE
			                                    WHEN elem ->> 'type' = 'metadata' AND elem ->> 'source' = @oldKey
			                                        THEN elem || jsonb_build_object('source', @newKey::text)
			                                    ELSE elem END)
			               FROM jsonb_array_elements(filters) AS elem)
			WHERE project_id = @projectId
			  AND jsonb_typeof(filters) = 'array'
			  AND EXISTS(SELECT 1
			             FROM jsonb_array_elements(filters) AS elem
			             WHERE elem ->> 'type' = 'metadata'
			               AND elem ->> 'source' = @oldKey)`,
			pgx.NamedArgs{"projectId": projectID, "oldKey": *current, "newKey": key}); err != nil {
			return fmt.Errorf("rename metadata conditions: %s", err)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return &MetadataKey{Key: key, Index: index}, nil
}

func (s *serviceImpl) DeleteMetadata(ctx context.Context, tenantID uint64, projectID uint32, index int) ([]*MetadataKey, error) {
	if !ValidMetadataIndex(index) {
		return nil, ErrMetadataNotFound
	}
	keys, err := s.updateMetadata(tenantID, projectID, func(tx *pool.Tx, keys *[maxMetadataKeys]*string) error {
		current := keys[index-1]
		if current == nil {
			return ErrMetadataNotFound
		}
		if err := setMetadataColumn(tx, projectID, index, nil); err != nil {
			return err
		}
		if err := tx.TxExec(`
			UPDATE public.projects_conditions
			SET filters = (SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
			               FROM jsonb_array_elements(filters) AS elem
			               WHERE NOT (elem ->> 'type' = 'metadata' AND elem ->> 'source' = @key))
			WHERE project_id = @projectId
			  AND jsonb_typeof(filters) = 'array'
			  AND EXISTS(SELECT 1
			             FROM jsonb_array_elements(filters) AS elem
			             WHERE elem ->> 'type' = 'metadata'
			               AND elem ->> 'source' = @key)`,
			pgx.NamedArgs{"projectId": projectID, "key": *current}); err != nil {
			return fmt.Errorf("delete metadata conditions: %s", err)
		}
		keys[index-1] = nil
		return nil
	})
	if err != nil {
		return nil, err
	}
	return metadataList(keys), nil
}
