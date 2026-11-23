package charts

import (
	"strings"
	"testing"

	"openreplay/backend/pkg/analytics/model"
	"openreplay/backend/pkg/logger"
)

func heatmapPayload(path string) *Payload {
	filters := []model.Filter{}
	if path != "" {
		filters = append(filters, model.Filter{
			Name: "LOCATION", IsEvent: true, Operator: "is", AutoCaptured: true,
			Filters: []model.Filter{{Name: "urlPath", Operator: "is", Value: []string{path}, AutoCaptured: true}},
		})
	}
	return &Payload{
		ProjectId: 7,
		UserId:    1,
		MetricPayload: &model.MetricPayload{
			StartTimestamp: 1700000000000,
			EndTimestamp:   1700604800000,
			Series:         []model.Series{{Filter: model.FilterGroup{Filters: filters}}},
		},
	}
}

func mustContain(t *testing.T, q string, parts ...string) {
	t.Helper()
	for _, part := range parts {
		if !strings.Contains(q, part) {
			t.Errorf("query is missing %q\nquery: %s", part, q)
		}
	}
}

func mustNotContain(t *testing.T, q string, parts ...string) {
	t.Helper()
	for _, part := range parts {
		if strings.Contains(q, part) {
			t.Errorf("query unexpectedly contains %q\nquery: %s", part, q)
		}
	}
}

func TestHeatmapPointsAggregatesCells(t *testing.T) {
	hm := &HeatmapQueryBuilder{Logger: logger.New()}
	p := heatmapPayload("/pricing")
	p.MetricPayload.IncludeClickRage = true
	q, params, err := hm.buildQuery(p)
	if err != nil {
		t.Fatal(err)
	}
	checkBindable(t, q, params)
	mustContain(t, q,
		"GROUP BY normalized_x, normalized_y",
		"count() AS count",
		"ORDER BY count DESC",
		"LIMIT 5000",
		`e."$current_path"`,
	)
	// the old query streamed the period's first 500 raw clicks
	mustNotContain(t, q, "LIMIT 500;", "ORDER BY e.created_at", "click_rage")
}

func TestHeatmapPointsCollapsesClickRageBursts(t *testing.T) {
	hm := &HeatmapQueryBuilder{Logger: logger.New()}
	q, params, err := hm.buildQuery(heatmapPayload("/pricing"))
	if err != nil {
		t.Fatal(err)
	}
	checkBindable(t, q, params)
	if params["clickRageWindowMs"] != clickRageWindowMs {
		t.Errorf("clickRageWindowMs = %v, want %d", params["clickRageWindowMs"], clickRageWindowMs)
	}
	mustContain(t, q,
		"r.issue_type = 'click_rage'",
		"groupArray(toUnixTimestamp64Milli(r.created_at)) AS rage_ts",
		"abs(toUnixTimestamp64Milli(e.created_at) - t) <= @clickRageWindowMs",
		// a burst keeps its first click, the same one on every load
		"(e.created_at, e.event_id) AS ord",
		"argMin(normalized_x, ord) AS normalized_x",
		"argMin(normalized_y, ord) AS normalized_y",
		"GROUP BY burst_key",
	)
	mustNotContain(t, q, "LIMIT 1 BY")
}

func TestHeatmapSessionQuery(t *testing.T) {
	hs := &HeatmapSessionQueryBuilder{Logger: logger.New()}
	for _, path := range []string{"/pricing", ""} {
		q, params, err := hs.buildQuery(heatmapPayload(path))
		if err != nil {
			t.Fatalf("path %q: %v", path, err)
		}
		checkBindable(t, q, params)
		mustContain(t, q,
			"toUInt64(toUnixTimestamp64Milli(e.last_click)) AS eventTs",
			"max(e.created_at) AS last_click",
			// equal durations can't swap the candidates, and a renderable one wins over a bounce
			"ORDER BY s.duration < @minRenderableSessionMs, s.duration ASC, s.session_id ASC",
			"ORDER BY duration < @minRenderableSessionMs, cityHash64(session_id, @heatmapSeed)",
		)
		mustNotContain(t, q, "rand()", "toUnixTimestamp(e.created_at)")
		if path == "" {
			mustContain(t, q, "WITH top_url_path AS (", `e."$current_path" = (SELECT url_path FROM top_url_path)`)
		} else {
			mustNotContain(t, q, "top_url_path")
		}
	}
}

func TestHeatmapSessionSeedIsBound(t *testing.T) {
	hs := &HeatmapSessionQueryBuilder{Logger: logger.New()}
	p := heatmapPayload("/pricing")
	_, params, _ := hs.buildQuery(p)
	if params["heatmapSeed"] != uint32(0) {
		t.Errorf("default seed = %v, want 0", params["heatmapSeed"])
	}
	p.MetricPayload.HeatmapSeed = 3
	_, params, _ = hs.buildQuery(p)
	if params["heatmapSeed"] != uint32(3) {
		t.Errorf("seed = %v, want 3", params["heatmapSeed"])
	}
}
