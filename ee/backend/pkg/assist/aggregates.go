package assist

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"

	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
)

// Port of ee/api/chalicelib/core/assist_stats.insert_aggregated_data, scheduled as
// crons/ee_crons.assist_events_aggregates_cron (hourly). Each run aggregates the assist
// events that arrived since the last watermark into hourly rows per project and agent in
// public.assist_events_aggregates, then records the newest aggregated event timestamp in
// public.assist_events_aggregates_logs as the next run's starting point.

const (
	AggregatesJobName = "assist_events_aggregates_cron"
	// aggregatesSchedule mirrors the Python IntervalTrigger(hours=1).
	aggregatesSchedule   = "@every 1h"
	aggregatesRunTimeout = 10 * time.Minute
	// aggregatesInsertBatch rows per INSERT statement (9 params each, far below the 65535 limit).
	aggregatesInsertBatch = 500
	// aggregatesFirstRunLookback is used when the tables are empty, like the Python first run.
	aggregatesFirstRunLookback = 7 * 24 * time.Hour
)

// AggregateRow is one hourly bucket of public.assist_events_aggregates.
type AggregateRow struct {
	Time         int64 // epoch ms, start of the hour
	ProjectID    int64
	AgentID      int64
	AssistAvg    int64
	CallAvg      int64
	ControlAvg   int64
	AssistTotal  int64
	CallTotal    int64
	ControlTotal int64
}

// AggregatesStorage is the Postgres side of the job (narrow interface for tests).
type AggregatesStorage interface {
	// LastWatermark returns MAX(time) of assist_events_aggregates_logs, nil when empty.
	LastWatermark(ctx context.Context) (*int64, error)
	// FirstEvent returns MIN(timestamp) of assist_events, nil when empty.
	FirstEvent(ctx context.Context) (*int64, error)
	// Aggregate streams the hourly buckets of events with timestamp in [start, end].
	Aggregate(ctx context.Context, start, end int64, fn func(AggregateRow) error) error
	// Insert appends rows to assist_events_aggregates.
	Insert(ctx context.Context, rows []AggregateRow) error
	// LatestEvent returns MAX(timestamp) of events with duration > 0 after the given timestamp, nil when none.
	LatestEvent(ctx context.Context, after int64) (*int64, error)
	// LogWatermark appends a row to assist_events_aggregates_logs.
	LogWatermark(ctx context.Context, ts int64) error
}

// AggregatesJob is the scheduler.Job computing assist aggregates.
type AggregatesJob struct {
	log   logger.Logger
	store AggregatesStorage
	now   func() time.Time
}

func NewAggregatesJob(log logger.Logger, pg pool.Pool) *AggregatesJob {
	return &AggregatesJob{log: log, store: &pgAggregates{pg: pg}, now: time.Now}
}

func (j *AggregatesJob) Name() string              { return AggregatesJobName }
func (j *AggregatesJob) DefaultSchedule() string   { return aggregatesSchedule }
func (j *AggregatesJob) RunTimeout() time.Duration { return aggregatesRunTimeout }

// Run is one tick of the Python cron. Unlike the Python version, errors are returned (and
// counted by the scheduler) instead of being swallowed, and rows are streamed and inserted
// in batches instead of paged with OFFSET.
func (j *AggregatesJob) Run(ctx context.Context) error {
	end := j.now().Unix() * 1000 // Python: int(datetime.timestamp(now())) * 1000
	start, err := j.windowStart(ctx, end)
	if err != nil {
		return err
	}
	// The Python query filters timestamp BETWEEN start+1 AND end.
	from := start + 1

	var batch []AggregateRow
	inserted := 0
	flush := func() error {
		if len(batch) == 0 {
			return nil
		}
		if err := j.store.Insert(ctx, batch); err != nil {
			return fmt.Errorf("insert aggregates: %w", err)
		}
		inserted += len(batch)
		batch = batch[:0]
		return nil
	}
	err = j.store.Aggregate(ctx, from, end, func(r AggregateRow) error {
		batch = append(batch, r)
		if len(batch) >= aggregatesInsertBatch {
			return flush()
		}
		return nil
	})
	if err != nil {
		return fmt.Errorf("aggregate assist events: %w", err)
	}
	if err := flush(); err != nil {
		return err
	}

	latest, err := j.store.LatestEvent(ctx, from)
	if err != nil {
		return fmt.Errorf("latest assist event: %w", err)
	}
	if latest != nil {
		if err := j.store.LogWatermark(ctx, *latest); err != nil {
			return fmt.Errorf("log watermark: %w", err)
		}
	}
	j.log.Info(ctx, "assist aggregates: window [%d, %d], %d rows inserted, watermark %v", from, end, inserted, deref(latest))
	return nil
}

// windowStart mirrors __last_run_end_timestamp_from_aggregates plus the first-run fallback:
// the last logged watermark, else the oldest event, else 7 days before end.
func (j *AggregatesJob) windowStart(ctx context.Context, end int64) (int64, error) {
	if ts, err := j.store.LastWatermark(ctx); err != nil {
		return 0, fmt.Errorf("last watermark: %w", err)
	} else if ts != nil {
		return *ts, nil
	}
	if ts, err := j.store.FirstEvent(ctx); err != nil {
		return 0, fmt.Errorf("first assist event: %w", err)
	} else if ts != nil {
		return *ts, nil
	}
	return end - aggregatesFirstRunLookback.Milliseconds(), nil
}

func deref(p *int64) any {
	if p == nil {
		return "none"
	}
	return *p
}

// ---- Postgres implementation --------------------------------------------------------

type pgAggregates struct {
	pg pool.Pool
}

// aggregateSQL is the Python hourly-averages query with the minute-step time series
// replaced by direct hour bucketing: the Python LEFT JOIN plus WHERE on assist_events only
// ever kept buckets that had events, so the result is identical. Events without an agent
// are skipped: assist_events_aggregates.agent_id is NOT NULL and the Python insert failed
// on them.
const aggregateSQL = `
SELECT (EXTRACT(epoch FROM date_trunc('hour', to_timestamp(timestamp / 1000)))::bigint * 1000) AS time,
       project_id,
       agent_id,
       ROUND(AVG(CASE WHEN event_type = 'assist' THEN duration ELSE 0 END))::bigint  AS assist_avg,
       ROUND(AVG(CASE WHEN event_type = 'call' THEN duration ELSE 0 END))::bigint    AS call_avg,
       ROUND(AVG(CASE WHEN event_type = 'control' THEN duration ELSE 0 END))::bigint AS control_avg,
       ROUND(SUM(CASE WHEN event_type = 'assist' THEN duration ELSE 0 END))::bigint  AS assist_total,
       ROUND(SUM(CASE WHEN event_type = 'call' THEN duration ELSE 0 END))::bigint    AS call_total,
       ROUND(SUM(CASE WHEN event_type = 'control' THEN duration ELSE 0 END))::bigint AS control_total
FROM public.assist_events
WHERE timestamp BETWEEN @start AND @end
  AND agent_id IS NOT NULL
GROUP BY time, project_id, agent_id
ORDER BY time`

func (s *pgAggregates) LastWatermark(ctx context.Context) (*int64, error) {
	return s.nullableInt64(`SELECT MAX(time) FROM public.assist_events_aggregates_logs`)
}

func (s *pgAggregates) FirstEvent(ctx context.Context) (*int64, error) {
	return s.nullableInt64(`SELECT MIN(timestamp) FROM public.assist_events`)
}

func (s *pgAggregates) LatestEvent(ctx context.Context, after int64) (*int64, error) {
	return s.nullableInt64(`SELECT MAX(timestamp) FROM public.assist_events WHERE timestamp > @after AND duration > 0`,
		pgx.NamedArgs{"after": after})
}

func (s *pgAggregates) nullableInt64(sql string, args ...any) (*int64, error) {
	var v *int64
	if err := s.pg.QueryRow(sql, args...).Scan(&v); err != nil {
		return nil, err
	}
	return v, nil
}

func (s *pgAggregates) Aggregate(ctx context.Context, start, end int64, fn func(AggregateRow) error) error {
	rows, err := s.pg.Query(aggregateSQL, pgx.NamedArgs{"start": start, "end": end})
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var r AggregateRow
		if err := rows.Scan(&r.Time, &r.ProjectID, &r.AgentID, &r.AssistAvg, &r.CallAvg, &r.ControlAvg,
			&r.AssistTotal, &r.CallTotal, &r.ControlTotal); err != nil {
			return err
		}
		if err := fn(r); err != nil {
			return err
		}
	}
	return rows.Err()
}

func (s *pgAggregates) Insert(ctx context.Context, rows []AggregateRow) error {
	if len(rows) == 0 {
		return nil
	}
	sql, args := buildAggregatesInsert(rows)
	return s.pg.ExecContext(ctx, sql, args...)
}

// buildAggregatesInsert renders one multi-row INSERT with positional parameters.
func buildAggregatesInsert(rows []AggregateRow) (string, []any) {
	var b strings.Builder
	b.WriteString(`INSERT INTO public.assist_events_aggregates
(timestamp, project_id, agent_id, assist_avg, call_avg, control_avg, assist_total, call_total, control_total)
VALUES `)
	args := make([]any, 0, 9*len(rows))
	for i, r := range rows {
		if i > 0 {
			b.WriteString(",\n       ")
		}
		n := len(args)
		fmt.Fprintf(&b, "($%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d)", n+1, n+2, n+3, n+4, n+5, n+6, n+7, n+8, n+9)
		args = append(args, r.Time, r.ProjectID, r.AgentID, r.AssistAvg, r.CallAvg, r.ControlAvg, r.AssistTotal, r.CallTotal, r.ControlTotal)
	}
	return b.String(), args
}

func (s *pgAggregates) LogWatermark(ctx context.Context, ts int64) error {
	return s.pg.ExecContext(ctx, `INSERT INTO public.assist_events_aggregates_logs (time) VALUES (@ts)`, pgx.NamedArgs{"ts": ts})
}
