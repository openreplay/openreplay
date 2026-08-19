package reconciler

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/lib/pq"

	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
)

type Pending struct {
	SessionID uint64
	ProjectID uint32
	StartTs   uint64
	Platform  string
	HasPGRow  bool // false if the session row is gone from public.sessions
}

type pgStore interface {
	LoadPending(limit int) ([]Pending, error)
	MarkChecked(found, missing, orphans []uint64) error
}

type chStore interface {
	Exists(pending []Pending) (map[uint64]bool, error)
}

type Reconciler struct {
	log       logger.Logger
	pg        pgStore
	ch        chStore
	tick      time.Duration
	batchSize int
	stop      chan struct{}
	done      chan struct{}
}

func New(log logger.Logger, pgConn pool.Pool, chConn driver.Conn, tick time.Duration, batchSize int) (*Reconciler, error) {
	switch {
	case log == nil:
		return nil, errors.New("nil logger")
	case pgConn == nil:
		return nil, errors.New("nil postgres connection")
	case chConn == nil:
		return nil, errors.New("nil clickhouse connection")
	}
	if tick <= 0 {
		tick = 5 * time.Minute
	}
	if batchSize <= 0 {
		batchSize = 1000
	}
	r := &Reconciler{
		log:       log,
		pg:        &pgStoreImpl{db: pgConn},
		ch:        &chStoreImpl{conn: chConn},
		tick:      tick,
		batchSize: batchSize,
		stop:      make(chan struct{}),
		done:      make(chan struct{}),
	}
	go r.run()
	return r, nil
}

func (r *Reconciler) run() {
	defer close(r.done)
	ticker := time.NewTicker(r.tick)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			r.drain()
		case <-r.stop:
			return
		}
	}
}

// drain processes pending rows batch by batch until the backlog is empty.
func (r *Reconciler) drain() {
	ctx := context.Background()
	for {
		n, err := r.processBatch(ctx)
		if err != nil {
			r.log.Error(ctx, "audit reconciler: %s", err)
			return
		}
		if n < r.batchSize {
			return
		}
		select {
		case <-r.stop:
			return
		default:
		}
	}
}

func (r *Reconciler) processBatch(ctx context.Context) (int, error) {
	pending, err := r.pg.LoadPending(r.batchSize)
	if err != nil {
		return 0, fmt.Errorf("can't load pending audit rows: %s", err)
	}
	if len(pending) == 0 {
		return 0, nil
	}

	var candidates []Pending
	var orphans []uint64
	for _, p := range pending {
		if p.HasPGRow {
			candidates = append(candidates, p)
		} else {
			orphans = append(orphans, p.SessionID)
		}
	}

	var found, missing []uint64
	if len(candidates) > 0 {
		inCH, err := r.ch.Exists(candidates)
		if err != nil {
			return 0, fmt.Errorf("can't check sessions in clickhouse: %s", err)
		}
		for _, c := range candidates {
			if inCH[c.SessionID] {
				found = append(found, c.SessionID)
				continue
			}
			missing = append(missing, c.SessionID)
			sessCtx := context.WithValue(ctx, "sessionID", fmt.Sprintf("%d", c.SessionID))
			r.log.Error(sessCtx, "SE_TRACE stage=reconcile_missing_in_ch sessID=%d project=%d platform=%s startTs=%d",
				c.SessionID, c.ProjectID, c.Platform, c.StartTs)
		}
	}
	for _, id := range orphans {
		r.log.Warn(ctx, "SE_TRACE stage=reconcile_no_pg_row sessID=%d", id)
	}

	if err := r.pg.MarkChecked(found, missing, orphans); err != nil {
		return 0, fmt.Errorf("can't save audit verdicts: %s", err)
	}
	return len(pending), nil
}

func (r *Reconciler) Stop() {
	close(r.stop)
	<-r.done
}

type pgStoreImpl struct {
	db pool.Pool
}

func (s *pgStoreImpl) LoadPending(limit int) ([]Pending, error) {
	rows, err := s.db.Query(`
		SELECT a.session_id, s.project_id, s.start_ts, s.platform::text
		FROM sessions_audit a
		LEFT JOIN sessions s USING (session_id)
		WHERE a.ch_checked_at IS NULL
		ORDER BY a.session_id
		LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	res := make([]Pending, 0, limit)
	for rows.Next() {
		var (
			sessionID int64
			projectID *int64
			startTs   *int64
			platform  *string
		)
		if err := rows.Scan(&sessionID, &projectID, &startTs, &platform); err != nil {
			return nil, err
		}
		p := Pending{SessionID: uint64(sessionID)}
		if projectID != nil && startTs != nil {
			p.HasPGRow = true
			p.ProjectID = uint32(*projectID)
			p.StartTs = uint64(*startTs)
			if platform != nil {
				p.Platform = *platform
			}
		}
		res = append(res, p)
	}
	return res, rows.Err()
}

func (s *pgStoreImpl) MarkChecked(found, missing, orphans []uint64) error {
	parts := []struct {
		ids     []uint64
		verdict string
	}{
		{found, "true"},
		{missing, "false"},
		{orphans, "NULL"}, // PG row is gone, presence in CH is unknown
	}
	for _, part := range parts {
		if len(part.ids) == 0 {
			continue
		}
		query := fmt.Sprintf(`
			UPDATE sessions_audit
			SET ch_checked_at = timezone('utc', now()), in_ch = %s
			WHERE session_id = ANY($1::bigint[])`, part.verdict)
		if err := s.db.Exec(query, pq.Array(toInt64(part.ids))); err != nil {
			return err
		}
	}
	return nil
}

func toInt64(ids []uint64) []int64 {
	res := make([]int64, len(ids))
	for i, id := range ids {
		res[i] = int64(id)
	}
	return res
}

type chStoreImpl struct {
	conn driver.Conn
}

func (s *chStoreImpl) Exists(pending []Pending) (map[uint64]bool, error) {
	ids := make([]string, 0, len(pending))
	projects := make(map[uint32]bool, len(pending))
	minTs, maxTs := pending[0].StartTs, pending[0].StartTs
	for _, p := range pending {
		ids = append(ids, strconv.FormatUint(p.SessionID, 10))
		projects[p.ProjectID] = true
		if p.StartTs < minTs {
			minTs = p.StartTs
		}
		if p.StartTs > maxTs {
			maxTs = p.StartTs
		}
	}
	projList := make([]string, 0, len(projects))
	for p := range projects {
		projList = append(projList, strconv.FormatUint(uint64(p), 10))
	}

	query := fmt.Sprintf(`
		SELECT DISTINCT session_id
		FROM experimental.sessions
		WHERE project_id IN (%s)
		  AND datetime >= toDateTime(%d)
		  AND datetime <= toDateTime(%d)
		  AND session_id IN (%s)`,
		strings.Join(projList, ","), minTs/1000-1, maxTs/1000+1, strings.Join(ids, ","))

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	rows, err := s.conn.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	res := make(map[uint64]bool, len(pending))
	for rows.Next() {
		var id uint64
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		res[id] = true
	}
	return res, rows.Err()
}
