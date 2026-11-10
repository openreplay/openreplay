package otel_logs

import (
	"context"
	"errors"
	"fmt"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"

	"openreplay/backend/pkg/analytics/filters"
	"openreplay/backend/pkg/logger"
)

const chTimeoutCode = 159

var ErrTimeout = errors.New("query timed out, narrow the time range or filters")

type Logs interface {
	Search(ctx context.Context, projectID uint32, req *SearchRequest) (*SearchResponse, error)
	Histogram(ctx context.Context, projectID uint32, f *Filter) (*HistogramResponse, error)
	Facets(ctx context.Context, projectID uint32, req *FacetsRequest) (any, error)
}

type logsImpl struct {
	log  logger.Logger
	conn driver.Conn
}

func New(log logger.Logger, conn driver.Conn) Logs {
	return &logsImpl{log: log, conn: conn}
}

func readContext(ctx context.Context) context.Context {
	return clickhouse.Context(ctx, clickhouse.WithSettings(clickhouse.Settings{
		"max_execution_time":            30,
		"use_skip_indexes_on_data_read": 1,
	}))
}

func facetContext(ctx context.Context) context.Context {
	return clickhouse.Context(ctx, clickhouse.WithSettings(clickhouse.Settings{
		"max_execution_time":            15,
		"timeout_overflow_mode":         "break",
		"use_skip_indexes_on_data_read": 1,
	}))
}

func wrapErr(err error) error {
	var ex *clickhouse.Exception
	if errors.As(err, &ex) && ex.Code == chTimeoutCode {
		return ErrTimeout
	}
	return err
}

const searchColumns = `toUnixTimestamp64Nano(Timestamp), SeverityText, SeverityNumber, ServiceName, Body, TraceId, SpanId,
	LogAttributes, ResourceAttributes, ScopeName, ScopeAttributes`

func (l *logsImpl) Search(ctx context.Context, projectID uint32, req *SearchRequest) (*SearchResponse, error) {
	if err := req.validate(); err != nil {
		return nil, err
	}
	limit := req.Limit
	if limit <= 0 {
		limit = defaultLimit
	}
	if limit > maxLimit {
		return nil, invalid("limit must not exceed %d", maxLimit)
	}
	cur, err := decodeCursor(req.Cursor)
	if err != nil {
		return nil, err
	}

	resp := &SearchResponse{Logs: make([]Log, 0, limit)}
	for {
		lo, hi, ok := window(req.StartTime, req.EndTime, cur.Window)
		if !ok {
			return resp, nil
		}
		want := limit - len(resp.Logs)
		got, err := l.searchWindow(ctx, projectID, &req.Filter, lo, hi, want, cur.Offset)
		if err != nil {
			return nil, err
		}
		resp.Logs = append(resp.Logs, got...)
		if len(got) == want {
			next := encodeCursor(cursor{Window: cur.Window, Offset: cur.Offset + len(got)})
			resp.NextCursor = &next
			return resp, nil
		}
		cur = cursor{Window: cur.Window + 1}
	}
}

func (l *logsImpl) searchWindow(ctx context.Context, projectID uint32, f *Filter, lo, hi int64, limit, offset int) ([]Log, error) {
	qp := filters.NewParams()
	where := buildConditions(projectID, f, lo, hi, exclusion{}, qp)
	qp.Set("limit", limit)
	qp.Set("offset", offset)
	query := fmt.Sprintf(`SELECT %s FROM otel.logs WHERE %s
		ORDER BY toStartOfFiveMinutes(Timestamp) DESC, Timestamp DESC, _block_number DESC, _block_offset DESC
		LIMIT @limit OFFSET @offset`, searchColumns, where)

	rows, err := l.conn.Query(readContext(ctx), query, qp.Args()...)
	if err != nil {
		return nil, wrapErr(err)
	}
	defer rows.Close()

	var logs []Log
	for rows.Next() {
		var r Log
		if err := rows.Scan(&r.Timestamp, &r.SeverityText, &r.SeverityNumber, &r.ServiceName, &r.Body, &r.TraceID, &r.SpanID,
			&r.LogAttributes, &r.ResourceAttributes, &r.ScopeName, &r.ScopeAttributes); err != nil {
			return nil, err
		}
		r.LogAttributes = stripInternal(r.LogAttributes)
		logs = append(logs, r)
	}
	return logs, wrapErr(rows.Err())
}

func (l *logsImpl) Histogram(ctx context.Context, projectID uint32, f *Filter) (*HistogramResponse, error) {
	if err := f.validate(); err != nil {
		return nil, err
	}
	step := histogramStep(f.StartTime, f.EndTime)
	qp := filters.NewParams()
	where := buildConditions(projectID, f, f.StartTime, f.EndTime, exclusion{}, qp)
	qp.Set("step", step)
	query := fmt.Sprintf(`SELECT intDiv(toUnixTimestamp(Timestamp), @step) * @step AS t, SeverityText, count()
		FROM otel.logs WHERE %s GROUP BY t, SeverityText`, where)

	rows, err := l.conn.Query(readContext(ctx), query, qp.Args()...)
	if err != nil {
		return nil, wrapErr(err)
	}
	defer rows.Close()

	counts := map[int64]map[string]uint64{}
	for rows.Next() {
		var (
			t   uint64
			sev string
			c   uint64
		)
		if err := rows.Scan(&t, &sev, &c); err != nil {
			return nil, err
		}
		if counts[int64(t)] == nil {
			counts[int64(t)] = map[string]uint64{}
		}
		counts[int64(t)][sev] = c
	}
	if err := rows.Err(); err != nil {
		return nil, wrapErr(err)
	}
	return &HistogramResponse{Step: step, Buckets: fillBuckets(f.StartTime, f.EndTime, step, counts)}, nil
}

func (l *logsImpl) Facets(ctx context.Context, projectID uint32, req *FacetsRequest) (any, error) {
	if err := req.validate(); err != nil {
		return nil, err
	}
	if req.Key != "" {
		if err := validateScopeKey(req.Scope, req.Key); err != nil {
			return nil, err
		}
		values, err := l.attributeValues(ctx, projectID, req)
		if err != nil {
			return nil, err
		}
		return &FacetValuesResponse{Key: req.Key, Values: values, Sampled: true}, nil
	}

	resp := &FacetsResponse{AttributeKeys: map[string][]KeyCount{}, Sampled: true}
	var err error
	if resp.Services, err = l.nativeFacet(ctx, projectID, &req.Filter, "ServiceName", exclusion{services: true}); err != nil {
		return nil, err
	}
	if resp.Severities, err = l.nativeFacet(ctx, projectID, &req.Filter, "SeverityText", exclusion{severities: true}); err != nil {
		return nil, err
	}
	for _, scope := range []string{"log", "resource"} {
		if resp.AttributeKeys[scope], err = l.attributeKeys(ctx, projectID, &req.Filter, scope); err != nil {
			return nil, err
		}
	}
	return resp, nil
}

func (l *logsImpl) nativeFacet(ctx context.Context, projectID uint32, f *Filter, column string, ex exclusion) ([]ValueCount, error) {
	qp := filters.NewParams()
	var query string
	if usesOnlyTime(f, ex) {
		qp.Set("projectId", projectID)
		qp.Set("startSec", f.StartTime/1000)
		qp.Set("endSec", (f.EndTime+999)/1000)
		qp.Set("key", column)
		query = `SELECT Value, sum(count) AS c FROM otel.logs_kv_rollup_15m
			WHERE ProjectId = @projectId AND ColumnIdentifier = 'NativeColumn' AND Key = @key
			  AND Timestamp >= toStartOfFifteenMinutes(toDateTime(@startSec)) AND Timestamp < toDateTime(@endSec)
			  AND notEmpty(Value)
			GROUP BY Value ORDER BY c DESC LIMIT ` + fmt.Sprint(facetLimit)
	} else {
		where := buildConditions(projectID, f, f.StartTime, f.EndTime, ex, qp)
		query = fmt.Sprintf(`SELECT toString(%s) AS v, count() AS c FROM otel.logs WHERE %s AND notEmpty(v)
			GROUP BY v ORDER BY c DESC LIMIT %d`, column, where, facetLimit)
	}
	return l.valueCounts(facetContext(ctx), query, qp)
}

func (l *logsImpl) attributeKeys(ctx context.Context, projectID uint32, f *Filter, scope string) ([]KeyCount, error) {
	mapCol, _ := attributeColumns(scope)
	qp := filters.NewParams()
	where := buildConditions(projectID, f, f.StartTime, f.EndTime, exclusion{}, qp)
	query := fmt.Sprintf(`SELECT k, count() AS c
		FROM (SELECT mapKeys(%s) AS keys FROM otel.logs WHERE %s LIMIT %d)
		ARRAY JOIN keys AS k
		WHERE NOT startsWith(k, '%s')
		GROUP BY k ORDER BY c DESC LIMIT %d`, mapCol, where, facetSampleRows, internalKeyPrefix, facetLimit)
	values, err := l.valueCounts(facetContext(ctx), query, qp)
	if err != nil {
		return nil, err
	}
	keys := make([]KeyCount, len(values))
	for i, v := range values {
		keys[i] = KeyCount{Key: v.Value, Count: v.Count}
	}
	return keys, nil
}

func (l *logsImpl) attributeValues(ctx context.Context, projectID uint32, req *FacetsRequest) ([]ValueCount, error) {
	mapCol, _ := attributeColumns(req.Scope)
	qp := filters.NewParams()
	where := buildConditions(projectID, &req.Filter, req.StartTime, req.EndTime, exclusion{attrScope: req.Scope, attrKey: req.Key}, qp)
	key := qp.Add(req.Key)
	query := fmt.Sprintf(`SELECT v, count() AS c
		FROM (SELECT %s[%s] AS v FROM otel.logs WHERE %s AND mapContains(%s, %s) LIMIT %d)
		GROUP BY v ORDER BY c DESC LIMIT %d`, mapCol, key, where, mapCol, key, facetSampleRows, facetLimit)
	return l.valueCounts(facetContext(ctx), query, qp)
}

func (l *logsImpl) valueCounts(ctx context.Context, query string, qp *filters.Params) ([]ValueCount, error) {
	rows, err := l.conn.Query(ctx, query, qp.Args()...)
	if err != nil {
		return nil, wrapErr(err)
	}
	defer rows.Close()
	values := make([]ValueCount, 0)
	for rows.Next() {
		var v ValueCount
		if err := rows.Scan(&v.Value, &v.Count); err != nil {
			return nil, err
		}
		values = append(values, v)
	}
	return values, wrapErr(rows.Err())
}
