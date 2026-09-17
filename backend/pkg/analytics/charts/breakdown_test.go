package charts

import (
	"encoding/json"
	"fmt"
	"testing"

	"openreplay/backend/pkg/analytics/model"
)

func bds(names ...string) []model.Breakdown {
	out := make([]model.Breakdown, 0, len(names))
	for _, n := range names {
		out = append(out, model.Breakdown{Name: n})
	}
	return out
}

func TestGetTableBreakdownProjection_InvalidBreakdown(t *testing.T) {
	defer func() {
		if r := recover(); r != nil {
			t.Errorf("GetTableBreakdownProjection panicked on invalid input: %v", r)
		}
	}()
	result := GetTableBreakdownProjection(bds("invalidDimension"))
	if len(result) != 0 {
		t.Errorf("expected empty result for invalid breakdown, got %v", result)
	}
}

func TestGetFunnelBreakdownProjection_InvalidBreakdown(t *testing.T) {
	defer func() {
		if r := recover(); r != nil {
			t.Errorf("GetFunnelBreakdownProjection panicked on invalid input: %v", r)
		}
	}()
	result := GetFunnelBreakdownProjection(bds("invalidDimension"))
	if len(result) != 0 {
		t.Errorf("expected empty result for invalid breakdown, got %v", result)
	}
}

// --- Task 5: Test ValidateBreakdowns ---

func TestValidateBreakdowns(t *testing.T) {
	tests := []struct {
		name       string
		breakdowns []string
		wantErr    bool
	}{
		{"nil breakdowns", nil, false},
		{"empty breakdowns", []string{}, false},
		{"valid single", []string{"userCountry"}, false},
		{"valid multiple", []string{"userCountry", "userBrowser", "userDevice"}, false},
		{"all nine valid", []string{"userCountry", "userCity", "userState"}, false},
		{"invalid dimension", []string{"invalidDim"}, true},
		{"mix valid and invalid", []string{"userCountry", "badName"}, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateBreakdowns(bds(tt.breakdowns...))
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateBreakdowns(bds(%v...)) error = %v, wantErr %v", tt.breakdowns, err, tt.wantErr)
			}
		})
	}
}

// --- Task 6: Test BreakdownTree insert, ToMap, WalkTree ---

func TestBreakdownTree_SingleLevel(t *testing.T) {
	tree := NewBreakdownTree(uint64(0))

	accumulate := func(v *uint64) { *v += 10 }
	newZero := func() uint64 { return 0 }

	tree.Insert([]string{"US"}, 1, newZero, accumulate)
	tree.Insert([]string{"US"}, 1, newZero, accumulate)
	tree.Insert([]string{"DE"}, 1, newZero, accumulate)

	render := func(v uint64) interface{} { return v }
	result := tree.ToMap(render)

	if result["$overall"] != uint64(30) {
		t.Errorf("$overall = %v, want 30", result["$overall"])
	}
	if result["US"] != uint64(20) {
		t.Errorf("US = %v, want 20", result["US"])
	}
	if result["DE"] != uint64(10) {
		t.Errorf("DE = %v, want 10", result["DE"])
	}
}

func TestBreakdownTree_TwoLevels(t *testing.T) {
	tree := NewBreakdownTree(uint64(0))

	accumulate := func(v *uint64) { *v += 5 }
	newZero := func() uint64 { return 0 }

	tree.Insert([]string{"US", "Chrome"}, 2, newZero, accumulate)
	tree.Insert([]string{"US", "Safari"}, 2, newZero, accumulate)
	tree.Insert([]string{"DE", "Chrome"}, 2, newZero, accumulate)

	render := func(v uint64) interface{} { return v }
	result := tree.ToMap(render)

	if result["$overall"] != uint64(15) {
		t.Errorf("$overall = %v, want 15", result["$overall"])
	}

	usMap, ok := result["US"].(map[string]interface{})
	if !ok {
		t.Fatalf("US should be a nested map, got %T", result["US"])
	}
	if usMap["$overall"] != uint64(10) {
		t.Errorf("US.$overall = %v, want 10", usMap["$overall"])
	}
	if usMap["Chrome"] != uint64(5) {
		t.Errorf("US.Chrome = %v, want 5", usMap["Chrome"])
	}
	if usMap["Safari"] != uint64(5) {
		t.Errorf("US.Safari = %v, want 5", usMap["Safari"])
	}
}

func TestNormalizeBreakdownValue(t *testing.T) {
	if got := NormalizeBreakdownValue(""); got != "(empty)" {
		t.Errorf("NormalizeBreakdownValue(\"\") = %q, want \"(empty)\"", got)
	}
	if got := NormalizeBreakdownValue("US"); got != "US" {
		t.Errorf("NormalizeBreakdownValue(\"US\") = %q, want \"US\"", got)
	}
}

func TestBreakdownTree_EmptyValueNormalized(t *testing.T) {
	tree := NewBreakdownTree(uint64(0))
	accumulate := func(v *uint64) { *v += 1 }
	newZero := func() uint64 { return 0 }

	tree.Insert([]string{""}, 1, newZero, accumulate)

	render := func(v uint64) interface{} { return v }
	result := tree.ToMap(render)

	if _, ok := result["(empty)"]; !ok {
		t.Errorf("expected (empty) key in result, got keys: %v", result)
	}
}

func TestWalkTree(t *testing.T) {
	tree := NewBreakdownTree(uint64(0))
	accumulate := func(v *uint64) { *v += 1 }
	newZero := func() uint64 { return 0 }

	tree.Insert([]string{"A"}, 1, newZero, accumulate)
	tree.Insert([]string{"B"}, 1, newZero, accumulate)

	var visited int
	WalkTree(tree, func(v *uint64) { visited++ })

	if visited != 3 {
		t.Errorf("WalkTree visited %d nodes, want 3", visited)
	}
}

// --- Task 7: Test SQL generation helpers ---

func TestGetBreakdownProjection(t *testing.T) {
	tests := []struct {
		name       string
		breakdowns []string
		alias      string
		want       string
	}{
		{"empty", []string{}, "s", ""},
		{"single", []string{"userCountry"}, "s", "s.user_country AS userCountry"},
		{"multiple", []string{"userCountry", "userBrowser"}, "s",
			"s.user_country AS userCountry, s.user_browser AS userBrowser"},
		{"invalid ignored", []string{"invalid"}, "s", ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := GetBreakdownProjection(bds(tt.breakdowns...), tt.alias)
			if got != tt.want {
				t.Errorf("GetBreakdownProjection(bds(%v...), %q) =\n  %q\nwant\n  %q", tt.breakdowns, tt.alias, got, tt.want)
			}
		})
	}
}

func TestBuildBreakdownGroupBy(t *testing.T) {
	tests := []struct {
		name       string
		baseCols   []string
		breakdowns []string
		want       string
	}{
		{"no breakdowns no base", []string{}, []string{}, ""},
		{"no breakdowns with base", []string{"timestamp"}, []string{}, "GROUP BY timestamp"},
		{"with breakdowns", []string{"timestamp"}, []string{"userCountry"}, "GROUP BY ALL"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := BuildBreakdownGroupBy(tt.baseCols, bds(tt.breakdowns...))
			if got != tt.want {
				t.Errorf("BuildBreakdownGroupBy() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestGetBreakdownSelectColumns(t *testing.T) {
	got := GetBreakdownSelectColumns(bds("userCountry", "userBrowser"), "ps")
	want := []string{"ps.userCountry", "ps.userBrowser"}
	if len(got) != len(want) {
		t.Fatalf("len = %d, want %d", len(got), len(want))
	}
	for i := range got {
		if got[i] != want[i] {
			t.Errorf("index %d: got %q, want %q", i, got[i], want[i])
		}
	}
}

func TestGetTableBreakdownProjection_Valid(t *testing.T) {
	got := GetTableBreakdownProjection(bds("userCountry", "userBrowser"))
	if len(got) != 2 {
		t.Fatalf("expected 2 parts, got %d", len(got))
	}
	if got[0] != "user_country AS break1" {
		t.Errorf("got[0] = %q, want %q", got[0], "user_country AS break1")
	}
	if got[1] != "user_browser AS break2" {
		t.Errorf("got[1] = %q, want %q", got[1], "user_browser AS break2")
	}
}

func TestFunnelBreakdownNeedsSessions(t *testing.T) {
	tests := []struct {
		name       string
		breakdowns []string
		want       bool
	}{
		{"event-only columns", []string{"userCountry", "userBrowser"}, false},
		{"session-required: userDevice", []string{"userDevice"}, true},
		{"session-required: userId", []string{"userId"}, true},
		{"session-required: platform", []string{"platform"}, true},
		{"mixed", []string{"userCountry", "platform"}, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := FunnelBreakdownNeedsSessions(bds(tt.breakdowns...))
			if got != tt.want {
				t.Errorf("FunnelBreakdownNeedsSessions(bds(%v...)) = %v, want %v", tt.breakdowns, got, tt.want)
			}
		})
	}
}

// --- Task 8: Test BuildScanArgs and BuildTimeseriesSeriesMap ---

func TestBuildScanArgs(t *testing.T) {
	var ts uint64
	var count uint64
	bdVals := []string{"", ""}

	args := BuildScanArgs([]interface{}{&ts}, bdVals, []interface{}{&count})

	if len(args) != 4 {
		t.Fatalf("expected 4 args, got %d", len(args))
	}
	if args[1].(*string) != &bdVals[0] {
		t.Error("args[1] should point to bdVals[0]")
	}
	if args[2].(*string) != &bdVals[1] {
		t.Error("args[2] should point to bdVals[1]")
	}
}

func TestBuildTimeseriesSeriesMap_NoBreakdowns(t *testing.T) {
	data := map[breakdownKey]map[string]uint64{
		{Timestamp: 1000}: {"sessions": 10},
		{Timestamp: 2000}: {"sessions": 20},
	}

	result := BuildTimeseriesSeriesMap(data, bds(), []string{"sessions"})

	series, ok := result["series"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected series map, got %T", result["series"])
	}
	flat, ok := series["sessions"].(map[uint64]uint64)
	if !ok {
		t.Fatalf("expected flat map for sessions, got %T", series["sessions"])
	}
	if flat[1000] != 10 || flat[2000] != 20 {
		t.Errorf("unexpected flat data: %v", flat)
	}
}

// --- Tests for new Tier 1 breakdown dimensions ---

func TestValidateBreakdowns_NewDimensions(t *testing.T) {
	newDims := []string{"utmSource", "utmMedium", "utmCampaign", "userDeviceType"}
	for _, dim := range newDims {
		t.Run(dim, func(t *testing.T) {
			if err := ValidateBreakdowns(bds(dim)); err != nil {
				t.Errorf("ValidateBreakdowns(bds(%q...)) unexpected error: %v", dim, err)
			}
		})
	}
}

func TestGetTableBreakdownProjection_NewDimensions(t *testing.T) {
	tests := []struct {
		dim  string
		want string
	}{
		{"utmSource", "utm_source AS break1"},
		{"utmMedium", "utm_medium AS break1"},
		{"utmCampaign", "utm_campaign AS break1"},
		{"userDeviceType", "user_device_type AS break1"},
	}
	for _, tt := range tests {
		t.Run(tt.dim, func(t *testing.T) {
			got := GetTableBreakdownProjection(bds(tt.dim))
			if len(got) != 1 {
				t.Fatalf("expected 1 part, got %d", len(got))
			}
			if got[0] != tt.want {
				t.Errorf("got %q, want %q", got[0], tt.want)
			}
		})
	}
}

func TestGetFunnelBreakdownProjection_NewDimensions(t *testing.T) {
	tests := []struct {
		dim  string
		want string
	}{
		{"utmSource", "e.utm_source AS break1"},
		{"utmMedium", "e.utm_medium AS break1"},
		{"utmCampaign", "e.utm_campaign AS break1"},
		{"userDeviceType", `e."$device" AS break1`},
	}
	for _, tt := range tests {
		t.Run(tt.dim, func(t *testing.T) {
			got := GetFunnelBreakdownProjection(bds(tt.dim))
			if len(got) != 1 {
				t.Fatalf("expected 1 part, got %d", len(got))
			}
			if got[0] != tt.want {
				t.Errorf("got %q, want %q", got[0], tt.want)
			}
		})
	}
}

func TestFunnelBreakdownNeedsSessions_NewDimensions(t *testing.T) {
	// All new Tier 1 dimensions use event-level columns (e. prefix), so none need sessions
	noSessionDims := []string{"utmSource", "utmMedium", "utmCampaign", "userDeviceType"}
	for _, dim := range noSessionDims {
		t.Run(dim, func(t *testing.T) {
			if FunnelBreakdownNeedsSessions(bds(dim)) {
				t.Errorf("FunnelBreakdownNeedsSessions(bds(%q...)) = true, want false", dim)
			}
		})
	}
}

func TestGetBreakdownProjection_NewDimensions(t *testing.T) {
	got := GetBreakdownProjection(bds("utmSource", "userDeviceType"), "s")
	want := "s.utm_source AS utmSource, s.user_device_type AS userDeviceType"
	if got != want {
		t.Errorf("GetBreakdownProjection() =\n  %q\nwant\n  %q", got, want)
	}
}

// --- Tests for revId and issueType breakdown dimensions ---

func TestValidateBreakdowns_RevIdAndIssueType(t *testing.T) {
	for _, dim := range []string{"revId", "issueType"} {
		t.Run(dim, func(t *testing.T) {
			if err := ValidateBreakdowns(bds(dim)); err != nil {
				t.Errorf("ValidateBreakdowns(bds(%q...)) unexpected error: %v", dim, err)
			}
		})
	}
}

func TestGetTableBreakdownProjection_RevId(t *testing.T) {
	got := GetTableBreakdownProjection(bds("revId"))
	if len(got) != 1 {
		t.Fatalf("expected 1 part, got %d", len(got))
	}
	if got[0] != "rev_id AS break1" {
		t.Errorf("got %q, want %q", got[0], "rev_id AS break1")
	}
}

func TestGetTableBreakdownProjection_IssueType(t *testing.T) {
	got := GetTableBreakdownProjection(bds("issueType"))
	if len(got) != 1 {
		t.Fatalf("expected 1 part, got %d", len(got))
	}
	if got[0] != "arrayJoin(issue_types) AS break1" {
		t.Errorf("got %q, want %q", got[0], "arrayJoin(issue_types) AS break1")
	}
}

func TestGetFunnelBreakdownProjection_RevId(t *testing.T) {
	got := GetFunnelBreakdownProjection(bds("revId"))
	if len(got) != 1 {
		t.Fatalf("expected 1 part, got %d", len(got))
	}
	// revId EventColumn is "s.rev_id" (sessions join)
	if got[0] != "s.rev_id AS break1" {
		t.Errorf("got %q, want %q", got[0], "s.rev_id AS break1")
	}
}

func TestGetFunnelBreakdownProjection_IssueType(t *testing.T) {
	got := GetFunnelBreakdownProjection(bds("issueType"))
	if len(got) != 1 {
		t.Fatalf("expected 1 part, got %d", len(got))
	}
	if got[0] != "e.issue_type AS break1" {
		t.Errorf("got %q, want %q", got[0], "e.issue_type AS break1")
	}
}

func TestFunnelBreakdownNeedsSessions_RevId(t *testing.T) {
	// revId uses s.rev_id in events context, needs sessions join
	if !FunnelBreakdownNeedsSessions(bds("revId")) {
		t.Error("FunnelBreakdownNeedsSessions(bds(revId...)) = false, want true")
	}
}

func TestFunnelBreakdownNeedsSessions_IssueType(t *testing.T) {
	// issueType uses e.issue_type, no sessions join needed
	if FunnelBreakdownNeedsSessions(bds("issueType")) {
		t.Error("FunnelBreakdownNeedsSessions(bds(issueType...)) = true, want false")
	}
}

func TestGetBreakdownProjection_IssueTypeNoPrefix(t *testing.T) {
	// arrayJoin(issue_types) contains "(" so should NOT get table alias prefix
	got := GetBreakdownProjection(bds("issueType"), "s")
	want := "arrayJoin(issue_types) AS issueType"
	if got != want {
		t.Errorf("GetBreakdownProjection(bds(issueType...)) =\n  %q\nwant\n  %q", got, want)
	}
}

func TestGetBreakdownProjection_RevIdGetsPrefix(t *testing.T) {
	got := GetBreakdownProjection(bds("revId"), "s")
	want := "s.rev_id AS revId"
	if got != want {
		t.Errorf("GetBreakdownProjection(bds(revId...)) =\n  %q\nwant\n  %q", got, want)
	}
}

func TestValidateBreakdowns_EventOnlyDimensions(t *testing.T) {
	eventOnlyDims := []string{"currentPath", "referringDomain", "searchEngine"}
	for _, dim := range eventOnlyDims {
		t.Run(dim, func(t *testing.T) {
			if err := ValidateBreakdowns(bds(dim)); err != nil {
				t.Errorf("ValidateBreakdowns(bds(%q...)) unexpected error: %v", dim, err)
			}
		})
	}
}

func TestHasEventOnlyBreakdowns(t *testing.T) {
	tests := []struct {
		name       string
		breakdowns []string
		want       bool
	}{
		{"empty", nil, false},
		{"session-only", []string{"userCountry", "userBrowser"}, false},
		{"event-only", []string{"currentPath"}, true},
		{"mixed", []string{"userCountry", "currentPath"}, true},
		{"all event-only", []string{"currentPath", "referringDomain", "searchEngine"}, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := HasEventOnlyBreakdowns(bds(tt.breakdowns...))
			if got != tt.want {
				t.Errorf("HasEventOnlyBreakdowns(bds(%v...)) = %v, want %v", tt.breakdowns, got, tt.want)
			}
		})
	}
}

func TestSplitBreakdowns(t *testing.T) {
	session, eventOnly := SplitBreakdowns(bds("userCountry", "currentPath", "userBrowser", "searchEngine"))
	if len(session) != 2 || session[0].Name != "userCountry" || session[1].Name != "userBrowser" {
		t.Errorf("session breakdowns = %v, want [userCountry userBrowser]", session)
	}
	if len(eventOnly) != 2 || eventOnly[0].Name != "currentPath" || eventOnly[1].Name != "searchEngine" {
		t.Errorf("eventOnly breakdowns = %v, want [currentPath searchEngine]", eventOnly)
	}
}

func TestGetTableBreakdownProjection_SkipsEventOnly(t *testing.T) {
	got := GetTableBreakdownProjection(bds("currentPath"))
	if len(got) != 0 {
		t.Errorf("expected empty result for event-only dim, got %v", got)
	}
}

func TestGetTableBreakdownProjection_MixedDims(t *testing.T) {
	got := GetTableBreakdownProjection(bds("userCountry", "currentPath", "userBrowser"))
	if len(got) != 2 {
		t.Fatalf("expected 2 parts (skipping event-only), got %d: %v", len(got), got)
	}
	if got[0] != "user_country AS break1" {
		t.Errorf("got[0] = %q, want %q", got[0], "user_country AS break1")
	}
	if got[1] != "user_browser AS break3" {
		t.Errorf("got[1] = %q, want %q", got[1], "user_browser AS break3")
	}
}

func TestGetEventOnlyBreakdownProjection(t *testing.T) {
	got := GetEventOnlyBreakdownProjection(bds("userCountry", "currentPath", "userBrowser"), "main")
	if len(got) != 1 {
		t.Fatalf("expected 1 event-only part, got %d: %v", len(got), got)
	}
	want := `main."$current_path" AS break2`
	if got[0] != want {
		t.Errorf("got %q, want %q", got[0], want)
	}
}

func TestGetEventOnlyBreakdownNamedProjection(t *testing.T) {
	got := GetEventOnlyBreakdownNamedProjection(bds("userCountry", "searchEngine"), "main")
	if len(got) != 1 {
		t.Fatalf("expected 1 part, got %d: %v", len(got), got)
	}
	want := `main."$search_engine" AS searchEngine`
	if got[0] != want {
		t.Errorf("got %q, want %q", got[0], want)
	}
}

func TestGetBreakdownProjection_SkipsEventOnly(t *testing.T) {
	got := GetBreakdownProjection(bds("currentPath", "referringDomain"), "s")
	if got != "" {
		t.Errorf("expected empty for event-only dims, got %q", got)
	}
}

func TestGetBreakdownProjection_MixedDims(t *testing.T) {
	got := GetBreakdownProjection(bds("userCountry", "currentPath"), "s")
	want := "s.user_country AS userCountry"
	if got != want {
		t.Errorf("got %q, want %q", got, want)
	}
}

func TestGetFunnelBreakdownProjection_EventOnlyDims(t *testing.T) {
	got := GetFunnelBreakdownProjection(bds("currentPath"))
	if len(got) != 1 {
		t.Fatalf("expected 1 part, got %d", len(got))
	}
	want := `e."$current_path" AS break1`
	if got[0] != want {
		t.Errorf("got %q, want %q", got[0], want)
	}
}

func TestFunnelBreakdownNeedsSessions_EventOnlyDims(t *testing.T) {
	if FunnelBreakdownNeedsSessions(bds("currentPath", "searchEngine")) {
		t.Error("FunnelBreakdownNeedsSessions(bds(event-only...)) = true, want false")
	}
}

// --- Tests for JSON property breakdown dimensions (httpMethod, statusCode, urlHost) ---

func TestValidateBreakdowns_JSONPropertyDimensions(t *testing.T) {
	for _, dim := range []string{"httpMethod", "statusCode", "urlHost"} {
		t.Run(dim, func(t *testing.T) {
			if err := ValidateBreakdowns(bds(dim)); err != nil {
				t.Errorf("ValidateBreakdowns(bds(%q...)) unexpected error: %v", dim, err)
			}
		})
	}
}

func TestHasEventOnlyBreakdowns_JSONProps(t *testing.T) {
	if !HasEventOnlyBreakdowns(bds("httpMethod")) {
		t.Error("httpMethod should be event-only")
	}
	if !HasEventOnlyBreakdowns(bds("statusCode")) {
		t.Error("statusCode should be event-only")
	}
	if !HasEventOnlyBreakdowns(bds("urlHost")) {
		t.Error("urlHost should be event-only")
	}
}

func TestGetEventOnlyBreakdownProjection_JSONProps(t *testing.T) {
	tests := []struct {
		dim  string
		want string
	}{
		{"httpMethod", `toString(main."$properties"."method") AS break1`},
		{"statusCode", `toString(main."$properties"."status") AS break1`},
		{"urlHost", `toString(main."$properties"."url_host") AS break1`},
	}
	for _, tt := range tests {
		t.Run(tt.dim, func(t *testing.T) {
			got := GetEventOnlyBreakdownProjection(bds(tt.dim), "main")
			if len(got) != 1 {
				t.Fatalf("expected 1 part, got %d: %v", len(got), got)
			}
			if got[0] != tt.want {
				t.Errorf("got %q, want %q", got[0], tt.want)
			}
		})
	}
}

func TestGetFunnelBreakdownProjection_JSONProps(t *testing.T) {
	tests := []struct {
		dim  string
		want string
	}{
		{"httpMethod", `toString(e."$properties"."method") AS break1`},
		{"statusCode", `toString(e."$properties"."status") AS break1`},
		{"urlHost", `toString(e."$properties"."url_host") AS break1`},
	}
	for _, tt := range tests {
		t.Run(tt.dim, func(t *testing.T) {
			got := GetFunnelBreakdownProjection(bds(tt.dim))
			if len(got) != 1 {
				t.Fatalf("expected 1 part, got %d: %v", len(got), got)
			}
			if got[0] != tt.want {
				t.Errorf("got %q, want %q", got[0], tt.want)
			}
		})
	}
}

func TestGetEventOnlyBreakdownNamedProjection_JSONProps(t *testing.T) {
	got := GetEventOnlyBreakdownNamedProjection(bds("httpMethod", "urlHost"), "main")
	if len(got) != 2 {
		t.Fatalf("expected 2 parts, got %d: %v", len(got), got)
	}
	if got[0] != `toString(main."$properties"."method") AS httpMethod` {
		t.Errorf("got[0] = %q", got[0])
	}
	if got[1] != `toString(main."$properties"."url_host") AS urlHost` {
		t.Errorf("got[1] = %q", got[1])
	}
}

func TestBuildTimeseriesSeriesMap_WithBreakdowns(t *testing.T) {
	data := map[breakdownKey]map[string]uint64{
		{Timestamp: 1000, Values: [3]string{"US", "", ""}}: {"sessions": 8},
		{Timestamp: 1000, Values: [3]string{"DE", "", ""}}: {"sessions": 2},
		{Timestamp: 2000, Values: [3]string{"US", "", ""}}: {"sessions": 15},
	}

	result := BuildTimeseriesSeriesMap(data, bds("userCountry"), []string{"sessions"})

	series, ok := result["series"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected series map, got %T", result["series"])
	}

	sessionsTree, ok := series["sessions"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected tree map for sessions, got %T", series["sessions"])
	}

	if _, exists := sessionsTree["$overall"]; !exists {
		t.Error("expected $overall key in tree")
	}
	if _, exists := sessionsTree["US"]; !exists {
		t.Error("expected US key in tree")
	}
}

func evBd(name string, autoCaptured bool, dataType string) model.Breakdown {
	return model.Breakdown{Name: name, IsEvent: true, AutoCaptured: autoCaptured, DataType: dataType}
}

func TestBreakdownUnmarshalLegacyString(t *testing.T) {
	var got []model.Breakdown
	if err := json.Unmarshal([]byte(`["userCountry","currentPath"]`), &got); err != nil {
		t.Fatalf("unmarshal legacy: %v", err)
	}
	if len(got) != 2 {
		t.Fatalf("got %d breakdowns, want 2", len(got))
	}
	if got[0].Name != "userCountry" || got[0].IsEvent || got[0].AutoCaptured || got[0].DataType != "" {
		t.Errorf("got[0] = %+v", got[0])
	}
	if got[1].Name != "currentPath" {
		t.Errorf("got[1].Name = %q", got[1].Name)
	}
	if err := ValidateBreakdowns(got); err != nil {
		t.Errorf("legacy breakdowns rejected: %v", err)
	}
}

func TestBreakdownUnmarshalObject(t *testing.T) {
	var got []model.Breakdown
	raw := `[{"name":"planType","isEvent":true,"autoCaptured":false,"dataType":"string"}]`
	if err := json.Unmarshal([]byte(raw), &got); err != nil {
		t.Fatalf("unmarshal object: %v", err)
	}
	want := model.Breakdown{Name: "planType", IsEvent: true, AutoCaptured: false, DataType: "string"}
	if got[0] != want {
		t.Errorf("got %+v, want %+v", got[0], want)
	}
}

func TestBreakdownMarshalRoundTrip(t *testing.T) {
	in := []model.Breakdown{{Name: "planType", IsEvent: true, DataType: "string"}}
	data, err := json.Marshal(in)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	var out []model.Breakdown
	if err := json.Unmarshal(data, &out); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if out[0] != in[0] {
		t.Errorf("round trip changed value: %+v -> %+v", in[0], out[0])
	}
}

func TestValidateBreakdowns_UnknownSessionKeyRejected(t *testing.T) {
	for _, name := range []string{"planType", "notAColumn", "metadata_11", "'; DROP TABLE x --"} {
		t.Run(name, func(t *testing.T) {
			if err := ValidateBreakdowns([]model.Breakdown{{Name: name}}); err == nil {
				t.Errorf("ValidateBreakdowns(%q) = nil, want error", name)
			}
		})
	}
}

func TestValidateBreakdowns_SessionCatalogKeys(t *testing.T) {
	for _, name := range []string{"duration", "userBrowserVersion", "screenHeight", "screenWidth", "issue", "metadata_1", "metadata_10", "user_os_version", "userOsVersion"} {
		t.Run(name, func(t *testing.T) {
			if err := ValidateBreakdowns([]model.Breakdown{{Name: name}}); err != nil {
				t.Errorf("ValidateBreakdowns(%q) unexpected error: %v", name, err)
			}
		})
	}
}

func TestBreakdown_IssueAliasMatchesIssueType(t *testing.T) {
	alias := GetTableBreakdownProjection(bds("issue"))
	canonical := GetTableBreakdownProjection(bds("issueType"))
	if len(alias) != 1 || len(canonical) != 1 || alias[0] != canonical[0] {
		t.Fatalf("issue alias projection = %v, issueType = %v", alias, canonical)
	}
	if alias[0] != "arrayJoin(issue_types) AS break1" {
		t.Errorf("got %q", alias[0])
	}
	if FunnelBreakdownNeedsSessions(bds("issue")) {
		t.Error("issue should not require the sessions join")
	}
}

func TestBreakdown_NewSessionDimensions(t *testing.T) {
	tests := []struct {
		name  string
		table string
		join  bool
	}{
		{"duration", "toString(duration) AS break1", true},
		{"screenHeight", "ifNull(toString(screen_height), '') AS break1", true},
		{"screenWidth", "ifNull(toString(screen_width), '') AS break1", true},
		{"userBrowserVersion", "ifNull(user_browser_version, '') AS break1", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := GetTableBreakdownProjection(bds(tt.name))
			if len(got) != 1 || got[0] != tt.table {
				t.Errorf("GetTableBreakdownProjection(%q) = %v, want [%q]", tt.name, got, tt.table)
			}
			if FunnelBreakdownNeedsSessions(bds(tt.name)) != tt.join {
				t.Errorf("FunnelBreakdownNeedsSessions(%q) = %v, want %v", tt.name, !tt.join, tt.join)
			}
		})
	}
}

func TestBreakdown_MetadataColumn(t *testing.T) {
	got := GetTableBreakdownProjection([]model.Breakdown{{Name: "metadata_3"}})
	if len(got) != 1 || got[0] != "ifNull(toString(metadata_3), '') AS break1" {
		t.Fatalf("got %v", got)
	}
	if !FunnelBreakdownNeedsSessions([]model.Breakdown{{Name: "metadata_3"}}) {
		t.Error("metadata breakdown must require the sessions join")
	}
	if HasEventOnlyBreakdowns([]model.Breakdown{{Name: "metadata_3"}}) {
		t.Error("metadata breakdown must not be event-only")
	}
}

func TestBreakdown_DynamicAutoCapturedEventKey(t *testing.T) {
	b := []model.Breakdown{evBd("myPlanType", true, "string")}
	got := GetEventOnlyBreakdownProjection(b, "main")
	want := "toString(main.\"$properties\".`my_plan_type`) AS break1"
	if len(got) != 1 || got[0] != want {
		t.Fatalf("got %v, want [%q]", got, want)
	}
	if err := ValidateBreakdowns(b); err != nil {
		t.Errorf("dynamic event breakdown rejected: %v", err)
	}
	if !HasEventOnlyBreakdowns(b) {
		t.Error("dynamic event breakdown must be event-only")
	}
}

func TestBreakdown_DynamicCustomEventKeyUsesPropertiesColumn(t *testing.T) {
	got := GetEventOnlyBreakdownProjection([]model.Breakdown{evBd("planType", false, "string")}, "main")
	want := "toString(main.properties.`planType`) AS break1"
	if len(got) != 1 || got[0] != want {
		t.Fatalf("got %v, want [%q]", got, want)
	}
}

func TestBreakdown_DataTypeDoesNotAffectSQL(t *testing.T) {
	for _, dt := range []string{"int", "float", "number", "integer", "double", "long", "string", "boolean", ""} {
		t.Run(dt, func(t *testing.T) {
			got := GetEventOnlyBreakdownProjection([]model.Breakdown{evBd("itemCount", true, dt)}, "main")
			want := "toString(main.\"$properties\".`item_count`) AS break1"
			if len(got) != 1 || got[0] != want {
				t.Fatalf("dataType %q: got %v, want [%q]", dt, got, want)
			}
		})
	}
}

func TestBreakdown_DynamicKeyIsEscaped(t *testing.T) {
	got := GetEventOnlyBreakdownProjection([]model.Breakdown{evBd("pl'an", false, "string")}, "main")
	want := "toString(main.properties.`pl'an`) AS break1"
	if len(got) != 1 || got[0] != want {
		t.Fatalf("got %v, want [%q]", got, want)
	}
}

func TestBreakdown_DynamicNamedProjectionUsesPositionalAlias(t *testing.T) {
	got := GetEventOnlyBreakdownNamedProjection([]model.Breakdown{evBd("plan type", false, "string")}, "main")
	want := "toString(main.properties.`plan type`) AS break1"
	if len(got) != 1 || got[0] != want {
		t.Fatalf("got %v, want [%q]", got, want)
	}
	cols := GetBreakdownSelectColumns([]model.Breakdown{evBd("plan type", false, "string")}, "ps")
	if len(cols) != 1 || cols[0] != "ps.break1" {
		t.Fatalf("select columns = %v, want [ps.break1]", cols)
	}
	refs := GetBreakdownJoinRefs([]model.Breakdown{evBd("plan type", false, "string")}, "evt", "s")
	if len(refs) != 1 || refs[0] != "evt.break1" {
		t.Fatalf("join refs = %v, want [evt.break1]", refs)
	}
}

func TestBreakdown_DynamicEventKeyNoSessionsJoinInFunnel(t *testing.T) {
	b := []model.Breakdown{evBd("planType", false, "string")}
	if FunnelBreakdownNeedsSessions(b) {
		t.Error("dynamic event breakdown must not require the sessions join")
	}
	got := GetFunnelBreakdownProjection(b)
	want := "toString(e.properties.`planType`) AS break1"
	if len(got) != 1 || got[0] != want {
		t.Fatalf("got %v, want [%q]", got, want)
	}
	if len(GetTableBreakdownProjection(b)) != 0 {
		t.Error("dynamic event breakdown must not project into the sessions subquery")
	}
	if GetBreakdownProjection(b, "s") != "" {
		t.Error("dynamic event breakdown must not project into the sessions subquery")
	}
}

func TestBreakdown_EventPropertyRealColumn(t *testing.T) {
	got := GetFunnelBreakdownProjection([]model.Breakdown{evBd("issue_type", false, "string")})
	want := "e.issue_type AS break1"
	if len(got) != 1 || got[0] != want {
		t.Fatalf("got %v, want [%q]", got, want)
	}
}

func TestBreakdown_MixedStaticAndDynamicAliases(t *testing.T) {
	b := []model.Breakdown{{Name: "userCountry"}, evBd("planType", false, "string"), {Name: "duration"}}
	if err := ValidateBreakdowns(b); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	cols := GetBreakdownSelectColumns(b, "ps")
	want := []string{"ps.userCountry", "ps.break2", "ps.break3"}
	for i := range want {
		if cols[i] != want[i] {
			t.Errorf("cols[%d] = %q, want %q", i, cols[i], want[i])
		}
	}
	if proj := GetBreakdownProjection(b, "s"); proj != "s.user_country AS userCountry, toString(duration) AS break3" {
		t.Errorf("session projection = %q", proj)
	}
}

func TestBreakdown_RejectsNonProjectableSessionColumns(t *testing.T) {
	for _, name := range []string{"metadata", "Metadata", "METADATA"} {
		t.Run(name, func(t *testing.T) {
			if err := ValidateBreakdowns([]model.Breakdown{{Name: name}}); err == nil {
				t.Errorf("ValidateBreakdowns(%q) = nil, want error (no such sessions column)", name)
			}
		})
	}
	if err := ValidateBreakdowns([]model.Breakdown{{Name: "metadata_1"}}); err != nil {
		t.Errorf("metadata_1 must stay valid: %v", err)
	}
}

func TestBreakdown_EventFlagSkipsSessionScopedStaticDims(t *testing.T) {
	for _, name := range []string{"duration", "userCountry"} {
		t.Run(name, func(t *testing.T) {
			b := []model.Breakdown{evBd(name, false, "string")}
			if FunnelBreakdownNeedsSessions(b) {
				t.Errorf("%q with isEvent=true must not require the sessions join", name)
			}
			if !HasEventOnlyBreakdowns(b) {
				t.Errorf("%q with isEvent=true must be event-scoped", name)
			}
			got := GetEventOnlyBreakdownProjection(b, "main")
			want := fmt.Sprintf("toString(main.properties.`%s`) AS break1", name)
			if len(got) != 1 || got[0] != want {
				t.Fatalf("got %v, want [%q]", got, want)
			}
			if len(GetTableBreakdownProjection(b)) != 0 {
				t.Error("must not project into the sessions subquery")
			}
		})
	}
}

func TestBreakdown_EventOnlyStaticDimsStillMatchWithEventFlag(t *testing.T) {
	got := GetEventOnlyBreakdownProjection([]model.Breakdown{evBd("currentPath", false, "string")}, "main")
	want := `main."$current_path" AS break1`
	if len(got) != 1 || got[0] != want {
		t.Fatalf("got %v, want [%q]", got, want)
	}
}

func TestBreakdown_NonEventKeepsSessionScopedStaticDims(t *testing.T) {
	if !FunnelBreakdownNeedsSessions(bds("duration")) {
		t.Error("duration without isEvent must still use the session dimension")
	}
	got := GetBreakdownProjection(bds("userCountry"), "s")
	if got != "s.user_country AS userCountry" {
		t.Errorf("got %q", got)
	}
}

func TestBreakdown_DynamicKeyBypassesPropertyKeyMap(t *testing.T) {
	tests := []struct {
		name string
		auto bool
		want string
	}{
		{"location", false, "toString(main.properties.`location`) AS break1"},
		{"click", false, "toString(main.properties.`click`) AS break1"},
		{"request", false, "toString(main.properties.`request`) AS break1"},
		{"tag_id", false, "toString(main.properties.`tag_id`) AS break1"},
		{"url_path", false, "toString(main.properties.`url_path`) AS break1"},
		{"fetch", true, "toString(main.\"$properties\".`fetch`) AS break1"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := GetEventOnlyBreakdownProjection([]model.Breakdown{evBd(tt.name, tt.auto, "string")}, "main")
			if len(got) != 1 || got[0] != tt.want {
				t.Fatalf("got %v, want [%q]", got, tt.want)
			}
		})
	}
}

func TestValidateBreakdowns_RejectsDuplicatesAfterCanonicalization(t *testing.T) {
	if err := ValidateBreakdowns([]model.Breakdown{{Name: "issue"}, {Name: "issueType"}}); err == nil {
		t.Error("issue + issueType must be rejected as duplicates")
	}
	if err := ValidateBreakdowns([]model.Breakdown{{Name: "issue"}, {Name: "userCountry"}}); err != nil {
		t.Errorf("distinct breakdowns rejected: %v", err)
	}
}

func TestValidateBreakdowns_RejectsEmptyName(t *testing.T) {
	for _, name := range []string{"", " ", "\t", "\n  "} {
		if err := ValidateBreakdowns([]model.Breakdown{{Name: name, IsEvent: true}}); err == nil {
			t.Errorf("ValidateBreakdowns(%q, isEvent=true) = nil, want error", name)
		}
		if err := ValidateBreakdowns([]model.Breakdown{{Name: name}}); err == nil {
			t.Errorf("ValidateBreakdowns(%q) = nil, want error", name)
		}
	}
}

func TestBreakdown_MetadataColumnOnEventPath(t *testing.T) {
	b := []model.Breakdown{evBd("metadata_1", false, "string")}
	if err := ValidateBreakdowns(b); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if HasEventOnlyBreakdowns(b) {
		t.Error("metadata_1 with isEvent=true must be session-scoped")
	}
	if !FunnelBreakdownNeedsSessions(b) {
		t.Error("metadata_1 with isEvent=true must require the sessions join")
	}
	got := GetTableBreakdownProjection(b)
	if len(got) != 1 || got[0] != "ifNull(toString(metadata_1), '') AS break1" {
		t.Fatalf("got %v", got)
	}
}

func TestBreakdownMarshalsLegacyStringWhenPlain(t *testing.T) {
	data, err := json.Marshal([]model.Breakdown{{Name: "userCountry"}, {Name: "currentPath"}})
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	if string(data) != `["userCountry","currentPath"]` {
		t.Errorf("got %s, want [\"userCountry\",\"currentPath\"]", data)
	}
}

func TestBreakdownMarshalsObjectWhenEnriched(t *testing.T) {
	tests := []model.Breakdown{
		{Name: "planType", IsEvent: true},
		{Name: "planType", AutoCaptured: true},
		{Name: "planType", DataType: "int"},
	}
	for _, in := range tests {
		data, err := json.Marshal(in)
		if err != nil {
			t.Fatalf("marshal: %v", err)
		}
		if data[0] != '{' {
			t.Errorf("%+v marshalled as %s, want object", in, data)
		}
		var back model.Breakdown
		if err := json.Unmarshal(data, &back); err != nil {
			t.Fatalf("unmarshal: %v", err)
		}
		if back != in {
			t.Errorf("round trip changed value: %+v -> %+v", in, back)
		}
	}
}

func TestBreakdown_BacktickAndBackslashKeysEscaped(t *testing.T) {
	tests := []struct {
		key  string
		want string
	}{
		{"we`ird`k", "toString(main.properties.`we\\`ird\\`k`) AS break1"},
		{`back\slash`, "toString(main.properties.`back\\\\slash`) AS break1"},
		{"both\\`x", "toString(main.properties.`both\\\\\\`x`) AS break1"},
	}
	for _, tt := range tests {
		t.Run(tt.key, func(t *testing.T) {
			got := GetEventOnlyBreakdownProjection([]model.Breakdown{evBd(tt.key, false, "string")}, "main")
			if len(got) != 1 || got[0] != tt.want {
				t.Fatalf("got %q, want %q", got, tt.want)
			}
		})
	}
}

func TestBreakdown_VerifiedClusterForms(t *testing.T) {
	got := GetEventOnlyBreakdownProjection([]model.Breakdown{evBd("hesitationTime", true, "int")}, "main")
	want := "toString(main.\"$properties\".`hesitation_time`) AS break1"
	if len(got) != 1 || got[0] != want {
		t.Fatalf("autocaptured: got %v, want [%q]", got, want)
	}
	got = GetEventOnlyBreakdownProjection([]model.Breakdown{evBd("url", false, "string")}, "main")
	want = "toString(main.properties.`url`) AS break1"
	if len(got) != 1 || got[0] != want {
		t.Fatalf("custom: got %v, want [%q]", got, want)
	}
}

func TestBreakdown_RejectsDynamicKeyWithAtSign(t *testing.T) {
	for _, name := range []string{"user@id", "@projectId", "plan@", "user@Id"} {
		t.Run(name, func(t *testing.T) {
			if err := ValidateBreakdowns([]model.Breakdown{evBd(name, false, "string")}); err == nil {
				t.Errorf("ValidateBreakdowns(%q, isEvent=true) = nil, want error", name)
			}
			if err := ValidateBreakdowns([]model.Breakdown{evBd(name, true, "string")}); err == nil {
				t.Errorf("ValidateBreakdowns(%q, autoCaptured) = nil, want error", name)
			}
		})
	}
	if err := ValidateBreakdowns([]model.Breakdown{evBd("planType", false, "string")}); err != nil {
		t.Errorf("plain dynamic key rejected: %v", err)
	}
}
