package alerts

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"

	"openreplay/backend/pkg/analytics/model"
	"openreplay/backend/pkg/analytics/search"
	"openreplay/backend/pkg/logger"
)

// Evaluator computes an alert's value over its time window(s) and compares it to the threshold.
type Evaluator interface {
	Evaluate(ctx context.Context, a *AlertToExecute, nowMs int64) (Result, error)
}

type evaluatorImpl struct {
	log       logger.Logger
	ch        driver.Conn
	search    search.Search
	chTimeout time.Duration
}

func NewEvaluator(log logger.Logger, ch driver.Conn, srch search.Search, chTimeout time.Duration) Evaluator {
	return &evaluatorImpl{log: log, ch: ch, search: srch, chTimeout: chTimeout}
}

// ---- windows & decision -------------------------------------------------------

// Windows holds the epoch-ms bounds used for one evaluation. The current window is
// [CurStart, Now] and the previous one is [PrevStart, CurStart). Only currentPeriod
// drives the window size (parity with the Python processor; previousPeriod only feeds
// the check cadence).
type Windows struct {
	PrevStart int64
	CurStart  int64
	Now       int64
}

func windowsFor(a *AlertToExecute, nowMs int64) Windows {
	cp := int64(a.Options.CurrentPeriod) * minuteMs
	return Windows{PrevStart: nowMs - 2*cp, CurStart: nowMs - cp, Now: nowMs}
}

// needsPrevious reports whether the alert compares two windows.
func needsPrevious(a *AlertToExecute) bool {
	return a.DetectionMethod == DetectionChange
}

// decide turns the two window values into the alert value and the trigger decision.
// Percent change with an empty previous window yields 0 (Python: NULLIF(prev,0) -> NULL -> 0),
// so a jump from 0 to N never fires a percent alert.
func decide(a *AlertToExecute, cur, prev float64) Result {
	var v float64
	switch {
	case a.DetectionMethod != DetectionChange:
		v = cur
	case a.Change == ChangeTypePercent:
		if prev == 0 {
			v = 0
		} else {
			v = (cur/prev - 1) * 100
		}
	default:
		v = cur - prev
	}
	return Result{Value: v, Valid: a.Query.Operator.Compare(v, float64(a.Query.Right))}
}

// ---- predefined metrics ---------------------------------------------------------

const (
	aggAvg   = "avg"
	aggCount = "count"
)

type metricDef struct {
	table     string // FROM clause
	timeCol   string // time column of the table
	eventName string // "$event_name" filter on product_analytics.events, empty for sessions
	expr      string // value expression (for avg) or the column to count distinct
	agg       string // aggAvg | aggCount
	cond      string // extra WHERE condition
}

const (
	eventsTable   = "product_analytics.events AS events"
	sessionsTable = "experimental.sessions AS sessions"
	autoCaptured  = "events.`$auto_captured`"
)

func perfMetric(key string) metricDef {
	return metricDef{
		table:     eventsTable,
		timeCol:   "events.created_at",
		eventName: "LOCATION",
		expr:      fmt.Sprintf(`events."$properties".%s`, key),
		agg:       aggAvg,
		cond:      autoCaptured,
	}
}

// predefined maps alerts.query.left to its ClickHouse definition. Keys mirror
// schemas.AlertColumn in the Python API.
var predefined = map[string]metricDef{
	"performance.dom_content_loaded.average":     perfMetric("dom_content_loaded_event_time"),
	"performance.first_meaningful_paint.average": perfMetric("first_contentful_paint_time"),
	"performance.page_load_time.average":         perfMetric("load_event_time"),
	"performance.dom_build_time.average":         perfMetric("dom_building_time"),
	"performance.speed_index.average":            perfMetric("speed_index"),
	"performance.page_response_time.average":     perfMetric("response_time"),
	// The Python processor read first_contentful_paint_time here (copy-paste bug);
	// the web-vitals charts use the dedicated ttfb property.
	"performance.ttfb.average":           perfMetric("ttfb"),
	"performance.time_to_render.average": perfMetric("visually_complete"),
	"performance.crashes.count": {
		table:   sessionsTable,
		timeCol: "sessions.datetime",
		expr:    "sessions.session_id",
		agg:     aggCount,
		cond:    "sessions.duration > 0 AND sessions.errors_count > 0",
	},
	"errors.javascript.count": {
		table:     eventsTable,
		timeCol:   "events.created_at",
		eventName: "ERROR",
		expr:      "events.session_id",
		agg:       aggCount,
		cond:      autoCaptured + " AND events.`$properties`.'source' = 'js_exception'",
	},
	"errors.backend.count": {
		table:     eventsTable,
		timeCol:   "events.created_at",
		eventName: "ERROR",
		expr:      "events.session_id",
		agg:       aggCount,
		cond:      autoCaptured + " AND events.`$properties`.'source' != 'js_exception'",
	},
}

// IsPredefined reports whether left is a supported predefined metric.
func IsPredefined(left string) bool {
	_, ok := predefined[left]
	return ok
}

// Supported reports whether the evaluator knows how to compute the alert.
func Supported(a *AlertToExecute) bool {
	return a.IsSeries() || IsPredefined(a.Query.Left) || a.Query.IsProperty()
}

// ---- property metrics -----------------------------------------------------------

// propertySource describes where "properties.<key>" / "$properties.<key>" alerts read from.
// columns lists the JSON columns the table actually has; a source without the requested
// column is rejected before any query is sent.
type propertySource struct {
	table   string
	timeCol string
	columns map[string]struct{}
	// latestRowPer, when set, makes the scan deduplicate the ReplacingMergeTree by keeping the
	// most recent row per key (users: one row per update, tombstones via _is_deleted).
	latestRowPer string
}

var propertySources = map[string]propertySource{
	SourceEvents: {
		table:   "product_analytics.events",
		timeCol: "created_at",
		columns: map[string]struct{}{PropertiesColumn: {}, AutoPropertiesColumn: {}},
	},
	SourceUsers: {
		table:        "product_analytics.users",
		timeCol:      `"$last_seen"`,
		columns:      map[string]struct{}{PropertiesColumn: {}},
		latestRowPer: `"$user_id"`,
	},
	// experimental.sessions has no JSON properties column yet; the entry keeps the source
	// name valid so the alert is rejected with a precise error instead of "unknown source".
	SourceSessions: {
		table:   "experimental.sessions",
		timeCol: "datetime",
		columns: map[string]struct{}{},
	},
}

// buildPropertyQuery returns one ClickHouse query averaging the numeric value of a JSON
// property over the current and previous windows. The property key is a bound parameter
// (getSubcolumn takes a constant; clickhouse-go binds @propKey as an escaped string literal),
// so neither the key nor the threshold is spliced into the SQL. Non-numeric and missing
// values are NULL and therefore ignored by avg; zero is a legitimate value and is kept.
func buildPropertyQuery(a *AlertToExecute, w Windows) (string, []any, error) {
	ref, err := a.Query.Property()
	if err != nil {
		return "", nil, err
	}
	source := a.Query.EffectiveSource()
	src, ok := propertySources[source]
	if !ok {
		return "", nil, fmt.Errorf("unsupported property source %q", source)
	}
	if _, ok := src.columns[ref.Column]; !ok {
		return "", nil, fmt.Errorf("source %q (%s) has no %q column", source, src.table, ref.Column)
	}
	rangeStart := w.CurStart
	if needsPrevious(a) {
		rangeStart = w.PrevStart
	}
	valueExpr := fmt.Sprintf(`toFloat64OrNull(toString(getSubcolumn("%s", @propKey)))`, ref.Column)
	timeConds := []string{
		"project_id = @projectId",
		src.timeCol + " >= toDateTime(@rangeStart)",
		src.timeCol + " <= toDateTime(@now)",
	}
	var from string
	if src.latestRowPer != "" {
		from = fmt.Sprintf(`(SELECT %s AS t, %s AS v, _is_deleted
      FROM %s
      WHERE %s
      ORDER BY _timestamp DESC
      LIMIT 1 BY %s)
WHERE NOT _is_deleted`, src.timeCol, valueExpr, src.table, strings.Join(timeConds, "\n        AND "), src.latestRowPer)
	} else {
		from = fmt.Sprintf(`(SELECT %s AS t, %s AS v
      FROM %s
      WHERE %s)`, src.timeCol, valueExpr, src.table, strings.Join(timeConds, "\n        AND "))
	}
	query := fmt.Sprintf(`SELECT COALESCE(avgIf(v, t >= toDateTime(@curStart)), 0) AS cur,
       COALESCE(avgIf(v, t < toDateTime(@curStart)), 0) AS prev
FROM %s`, from)
	args := []any{
		clickhouse.Named("projectId", uint16(a.ProjectID)),
		clickhouse.Named("propKey", ref.Key),
		clickhouse.Named("rangeStart", rangeStart/1000),
		clickhouse.Named("curStart", w.CurStart/1000),
		clickhouse.Named("now", w.Now/1000),
	}
	return query, args, nil
}

// buildPredefinedQuery returns one ClickHouse query computing the current and previous
// window values in a single scan. Only the metric definition is spliced into the SQL;
// project, timestamps and event name are bound parameters, and the alert's operator and
// threshold never reach the database.
func buildPredefinedQuery(a *AlertToExecute, w Windows) (string, []any, error) {
	def, ok := predefined[a.Query.Left]
	if !ok {
		return "", nil, fmt.Errorf("unsupported alert metric %q", a.Query.Left)
	}
	rangeStart := w.CurStart
	if needsPrevious(a) {
		rangeStart = w.PrevStart
	}
	curCond := def.timeCol + " >= toDateTime(@curStart)"
	prevCond := def.timeCol + " < toDateTime(@curStart)"
	var sel string
	switch def.agg {
	case aggAvg:
		nonZero := fmt.Sprintf("isNotNull(%s) AND %s::Float64 != 0", def.expr, def.expr)
		sel = fmt.Sprintf(`COALESCE(avgIf(%s::Float64, %s AND %s), 0) AS cur,
       COALESCE(avgIf(%s::Float64, %s AND %s), 0) AS prev`,
			def.expr, curCond, nonZero, def.expr, prevCond, nonZero)
	case aggCount:
		sel = fmt.Sprintf(`toFloat64(uniqExactIf(%s, %s)) AS cur,
       toFloat64(uniqExactIf(%s, %s)) AS prev`, def.expr, curCond, def.expr, prevCond)
	default:
		return "", nil, fmt.Errorf("unknown aggregate %q", def.agg)
	}
	conds := []string{
		"project_id = @projectId",
		def.timeCol + " >= toDateTime(@rangeStart)",
		def.timeCol + " <= toDateTime(@now)",
	}
	args := []any{
		clickhouse.Named("projectId", uint16(a.ProjectID)),
		clickhouse.Named("rangeStart", rangeStart/1000),
		clickhouse.Named("curStart", w.CurStart/1000),
		clickhouse.Named("now", w.Now/1000),
	}
	if def.eventName != "" {
		conds = append(conds, "events.`$event_name` = @eventName")
		args = append(args, clickhouse.Named("eventName", def.eventName))
	}
	if def.cond != "" {
		conds = append(conds, def.cond)
	}
	query := fmt.Sprintf("SELECT %s\nFROM %s\nWHERE %s", sel, def.table, strings.Join(conds, "\n  AND "))
	return query, args, nil
}

// ---- evaluation --------------------------------------------------------------------

func (e *evaluatorImpl) Evaluate(ctx context.Context, a *AlertToExecute, nowMs int64) (Result, error) {
	w := windowsFor(a, nowMs)
	var cur, prev float64
	var err error
	switch {
	case a.IsSeries():
		cur, prev, err = e.seriesValues(ctx, a, w)
	case a.Query.IsProperty():
		cur, prev, err = e.queryValues(ctx, a, w, buildPropertyQuery)
	default:
		cur, prev, err = e.queryValues(ctx, a, w, buildPredefinedQuery)
	}
	if err != nil {
		return Result{}, err
	}
	return decide(a, cur, prev), nil
}

type queryBuilder func(*AlertToExecute, Windows) (string, []any, error)

// queryValues runs a (cur, prev) query built by buildPredefinedQuery or buildPropertyQuery.
func (e *evaluatorImpl) queryValues(ctx context.Context, a *AlertToExecute, w Windows, build queryBuilder) (float64, float64, error) {
	query, args, err := build(a, w)
	if err != nil {
		return 0, 0, err
	}
	qctx, cancel := context.WithTimeout(ctx, e.chTimeout)
	defer cancel()
	var cur, prev float64
	start := time.Now()
	if err := e.ch.QueryRow(qctx, query, args...).Scan(&cur, &prev); err != nil {
		e.log.Warn(ctx, "alert %d: clickhouse query failed after %s: %s\nQuery: %s", a.AlertID, time.Since(start), err, query)
		return 0, 0, fmt.Errorf("clickhouse query: %w", err)
	}
	return cur, prev, nil
}

// seriesRequest builds a fresh sessions-search request for [start, end]; GetCounts mutates
// the filters while resolving segments, so each call gets its own copy.
func seriesRequest(a *AlertToExecute, start, end int64) *model.SessionsSearchRequest {
	filters := make([]model.Filter, len(a.Filter.Filters))
	copy(filters, a.Filter.Filters)
	order := string(a.Filter.EventsOrder)
	if order == "" {
		order = "then"
	}
	return &model.SessionsSearchRequest{
		Filters:     filters,
		StartDate:   start,
		EndDate:     end,
		EventsOrder: order,
		Limit:       1,
		Page:        1,
	}
}

func (e *evaluatorImpl) seriesValues(ctx context.Context, a *AlertToExecute, w Windows) (float64, float64, error) {
	if a.Filter == nil {
		return 0, 0, fmt.Errorf("series alert without a series filter")
	}
	qctx, cancel := context.WithTimeout(ctx, e.chTimeout)
	defer cancel()
	cur, _, err := e.search.GetCounts(qctx, int(a.ProjectID), seriesRequest(a, w.CurStart, w.Now))
	if err != nil {
		return 0, 0, fmt.Errorf("series current window: %w", err)
	}
	if !needsPrevious(a) {
		return float64(cur), 0, nil
	}
	prev, _, err := e.search.GetCounts(qctx, int(a.ProjectID), seriesRequest(a, w.PrevStart, w.CurStart))
	if err != nil {
		return 0, 0, fmt.Errorf("series previous window: %w", err)
	}
	return float64(cur), float64(prev), nil
}
