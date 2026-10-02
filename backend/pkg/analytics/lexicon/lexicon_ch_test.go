package lexicon

import (
	"context"
	"fmt"
	"os/exec"
	"reflect"
	"strings"
	"testing"
	"time"
)

const distinctEventsSchema = `
CREATE DATABASE product_analytics;
CREATE FUNCTION or_event_display_name AS (x) -> x;
CREATE FUNCTION or_event_description AS (x) -> '';
CREATE TABLE product_analytics.all_events (
    project_id UInt16, auto_captured BOOL DEFAULT FALSE, event_name String,
    event_count_l30days UInt32 DEFAULT 0, query_count_l30days UInt32 DEFAULT 0,
    created_at DateTime64, _timestamp DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp) ORDER BY (project_id, auto_captured, event_name);
CREATE TABLE product_analytics.all_events_customized (
    project_id UInt16, auto_captured BOOL DEFAULT FALSE, event_name String,
    display_name String DEFAULT '', description String DEFAULT '',
    status LowCardinality(String) DEFAULT 'visible',
    created_at DateTime64, _deleted_at Nullable(DateTime64), _is_deleted BOOL DEFAULT FALSE,
    _timestamp DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp) ORDER BY (project_id, auto_captured, event_name);
CREATE TABLE product_analytics.event_properties (
    project_id UInt16, event_name String, property_name String, value_type String,
    auto_captured_event BOOL, auto_captured_property BOOL,
    created_at DateTime64, _timestamp DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(_timestamp)
ORDER BY (project_id, event_name, property_name, value_type, auto_captured_event, auto_captured_property);
CREATE TABLE product_analytics.autocomplete_events_grouped (
    project_id UInt16, value String, data_count AggregateFunction(sum, UInt16),
    _timestamp DateTime DEFAULT now()
) ENGINE = MergeTree ORDER BY (project_id, value);
INSERT INTO product_analytics.all_events (project_id, auto_captured, event_name, query_count_l30days, created_at, _timestamp) VALUES
 (1, false, 'a', 1, '2026-01-01 00:00:00', '2026-03-01 00:00:00'),
 (1, false, 'b', 2, '2026-01-02 00:00:00', '2026-04-01 00:00:00'),
 (1, true,  'c', 3, '2026-01-03 00:00:00', '2026-02-01 00:00:00'),
 (1, false, 'd', 4, '2026-01-04 00:00:00', '2026-04-01 00:00:00'),
 (2, false, 'z', 5, '2026-01-05 00:00:00', '2026-05-01 00:00:00');
INSERT INTO product_analytics.all_events_customized (project_id, auto_captured, event_name, display_name, created_at) VALUES
 (1, false, 'a', 'Alpha', '2026-01-01 00:00:00');
INSERT INTO product_analytics.event_properties (project_id, event_name, property_name, value_type, auto_captured_event, auto_captured_property, created_at) VALUES
 (1, 'a', 'plan', 'string', false, false, '2026-01-01 00:00:00'),
 (1, 'b', 'plan', 'string', false, false, '2026-01-01 00:00:00'),
 (1, 'c', 'plan', 'string', true, false, '2026-01-01 00:00:00');
`

func inlineArgs(query string, args []interface{}) string {
	for _, a := range args {
		var lit string
		switch v := a.(type) {
		case string:
			lit = "'" + strings.ReplaceAll(v, "'", "''") + "'"
		default:
			lit = fmt.Sprint(v)
		}
		query = strings.Replace(query, "?", lit, 1)
	}
	return query
}

func TestDistinctEventsQueryRunsOnClickHouse(t *testing.T) {
	bin, err := exec.LookPath("clickhouse")
	if err != nil {
		t.Skip("clickhouse binary not available")
	}
	probeCtx, probeCancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer probeCancel()
	if out, err := exec.CommandContext(probeCtx, bin, "local", "--query", "SELECT 1").CombinedOutput(); err != nil || strings.TrimSpace(string(out)) != "1" {
		t.Skipf("clickhouse binary unusable: %v %s", err, out)
	}
	prop := "plan"
	tests := []struct {
		name         string
		propertyName *string
		limit        int
		offset       int
		wantNames    []string
		wantTotal    string
	}{
		{"unpaged", nil, 0, 0, []string{"b", "d", "a", "c"}, "4"},
		{"paged", nil, 2, 1, []string{"d", "a"}, "4"},
		{"property unpaged", &prop, 0, 0, []string{"b", "a", "c"}, "3"},
		{"property paged", &prop, 1, 1, []string{"a"}, "3"},
		{"past last page", nil, 2, 10, nil, "4"},
		{"property past last page", &prop, 2, 10, nil, "3"},
	}
	for _, analyzer := range []string{"0", "1"} {
		for _, tt := range tests {
			t.Run(tt.name+"/enable_analyzer="+analyzer, func(t *testing.T) {
				query, args := buildDistinctEventsQuery(1, tt.propertyName, tt.limit, tt.offset)
				sql := distinctEventsSchema + inlineArgs(query, args) + " FORMAT TSV;"
				ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
				defer cancel()
				out, err := exec.CommandContext(ctx, bin, "local", "--multiquery", "--enable_analyzer="+analyzer, "--query", sql).CombinedOutput()
				if err != nil {
					t.Fatalf("clickhouse failed: %v\n%s", err, out)
				}
				var names []string
				for _, line := range strings.Split(strings.TrimSpace(string(out)), "\n") {
					if line == "" {
						continue
					}
					cols := strings.Split(line, "\t")
					if len(cols) != 9 {
						t.Fatalf("expected 9 columns, got %d: %q", len(cols), line)
					}
					if cols[0] != tt.wantTotal {
						t.Errorf("total = %s, want %s", cols[0], tt.wantTotal)
					}
					names = append(names, cols[1])
				}
				if !reflect.DeepEqual(names, tt.wantNames) {
					t.Errorf("names = %v, want %v", names, tt.wantNames)
				}
				countQuery, countArgs := buildDistinctEventsCountQuery(1, tt.propertyName)
				countSQL := distinctEventsSchema + inlineArgs(countQuery, countArgs) + " FORMAT TSV;"
				countOut, err := exec.CommandContext(ctx, bin, "local", "--multiquery", "--enable_analyzer="+analyzer, "--query", countSQL).CombinedOutput()
				if err != nil {
					t.Fatalf("clickhouse count failed: %v\n%s", err, countOut)
				}
				if got := strings.TrimSpace(string(countOut)); got != tt.wantTotal {
					t.Errorf("count = %s, want %s", got, tt.wantTotal)
				}
			})
		}
	}
}
