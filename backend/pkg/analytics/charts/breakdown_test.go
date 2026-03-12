package charts

import (
	"testing"
)

func TestGetTableBreakdownProjection_InvalidBreakdown(t *testing.T) {
	defer func() {
		if r := recover(); r != nil {
			t.Errorf("GetTableBreakdownProjection panicked on invalid input: %v", r)
		}
	}()
	result := GetTableBreakdownProjection([]string{"invalidDimension"})
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
	result := GetFunnelBreakdownProjection([]string{"invalidDimension"})
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
			err := ValidateBreakdowns(tt.breakdowns)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateBreakdowns(%v) error = %v, wantErr %v", tt.breakdowns, err, tt.wantErr)
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
			got := GetBreakdownProjection(tt.breakdowns, tt.alias)
			if got != tt.want {
				t.Errorf("GetBreakdownProjection(%v, %q) =\n  %q\nwant\n  %q", tt.breakdowns, tt.alias, got, tt.want)
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
			got := BuildBreakdownGroupBy(tt.baseCols, tt.breakdowns)
			if got != tt.want {
				t.Errorf("BuildBreakdownGroupBy() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestGetBreakdownSelectColumns(t *testing.T) {
	got := GetBreakdownSelectColumns([]string{"userCountry", "userBrowser"}, "ps")
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
	got := GetTableBreakdownProjection([]string{"userCountry", "userBrowser"})
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
			got := FunnelBreakdownNeedsSessions(tt.breakdowns)
			if got != tt.want {
				t.Errorf("FunnelBreakdownNeedsSessions(%v) = %v, want %v", tt.breakdowns, got, tt.want)
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

	result := BuildTimeseriesSeriesMap(data, []string{}, []string{"sessions"})

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
			if err := ValidateBreakdowns([]string{dim}); err != nil {
				t.Errorf("ValidateBreakdowns(%q) unexpected error: %v", dim, err)
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
			got := GetTableBreakdownProjection([]string{tt.dim})
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
			got := GetFunnelBreakdownProjection([]string{tt.dim})
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
			if FunnelBreakdownNeedsSessions([]string{dim}) {
				t.Errorf("FunnelBreakdownNeedsSessions(%q) = true, want false", dim)
			}
		})
	}
}

func TestGetBreakdownProjection_NewDimensions(t *testing.T) {
	got := GetBreakdownProjection([]string{"utmSource", "userDeviceType"}, "s")
	want := "s.utm_source AS utmSource, s.user_device_type AS userDeviceType"
	if got != want {
		t.Errorf("GetBreakdownProjection() =\n  %q\nwant\n  %q", got, want)
	}
}

// --- Tests for revId and issueType breakdown dimensions ---

func TestValidateBreakdowns_RevIdAndIssueType(t *testing.T) {
	for _, dim := range []string{"revId", "issueType"} {
		t.Run(dim, func(t *testing.T) {
			if err := ValidateBreakdowns([]string{dim}); err != nil {
				t.Errorf("ValidateBreakdowns(%q) unexpected error: %v", dim, err)
			}
		})
	}
}

func TestGetTableBreakdownProjection_RevId(t *testing.T) {
	got := GetTableBreakdownProjection([]string{"revId"})
	if len(got) != 1 {
		t.Fatalf("expected 1 part, got %d", len(got))
	}
	if got[0] != "rev_id AS break1" {
		t.Errorf("got %q, want %q", got[0], "rev_id AS break1")
	}
}

func TestGetTableBreakdownProjection_IssueType(t *testing.T) {
	got := GetTableBreakdownProjection([]string{"issueType"})
	if len(got) != 1 {
		t.Fatalf("expected 1 part, got %d", len(got))
	}
	if got[0] != "arrayJoin(issue_types) AS break1" {
		t.Errorf("got %q, want %q", got[0], "arrayJoin(issue_types) AS break1")
	}
}

func TestGetFunnelBreakdownProjection_RevId(t *testing.T) {
	got := GetFunnelBreakdownProjection([]string{"revId"})
	if len(got) != 1 {
		t.Fatalf("expected 1 part, got %d", len(got))
	}
	// revId EventColumn is "s.rev_id" (sessions join)
	if got[0] != "s.rev_id AS break1" {
		t.Errorf("got %q, want %q", got[0], "s.rev_id AS break1")
	}
}

func TestGetFunnelBreakdownProjection_IssueType(t *testing.T) {
	got := GetFunnelBreakdownProjection([]string{"issueType"})
	if len(got) != 1 {
		t.Fatalf("expected 1 part, got %d", len(got))
	}
	if got[0] != "e.issue_type AS break1" {
		t.Errorf("got %q, want %q", got[0], "e.issue_type AS break1")
	}
}

func TestFunnelBreakdownNeedsSessions_RevId(t *testing.T) {
	// revId uses s.rev_id in events context, needs sessions join
	if !FunnelBreakdownNeedsSessions([]string{"revId"}) {
		t.Error("FunnelBreakdownNeedsSessions(revId) = false, want true")
	}
}

func TestFunnelBreakdownNeedsSessions_IssueType(t *testing.T) {
	// issueType uses e.issue_type, no sessions join needed
	if FunnelBreakdownNeedsSessions([]string{"issueType"}) {
		t.Error("FunnelBreakdownNeedsSessions(issueType) = true, want false")
	}
}

func TestGetBreakdownProjection_IssueTypeNoPrefix(t *testing.T) {
	// arrayJoin(issue_types) contains "(" so should NOT get table alias prefix
	got := GetBreakdownProjection([]string{"issueType"}, "s")
	want := "arrayJoin(issue_types) AS issueType"
	if got != want {
		t.Errorf("GetBreakdownProjection(issueType) =\n  %q\nwant\n  %q", got, want)
	}
}

func TestGetBreakdownProjection_RevIdGetsPrefix(t *testing.T) {
	got := GetBreakdownProjection([]string{"revId"}, "s")
	want := "s.rev_id AS revId"
	if got != want {
		t.Errorf("GetBreakdownProjection(revId) =\n  %q\nwant\n  %q", got, want)
	}
}

func TestBuildTimeseriesSeriesMap_WithBreakdowns(t *testing.T) {
	data := map[breakdownKey]map[string]uint64{
		{Timestamp: 1000, Values: [3]string{"US", "", ""}}: {"sessions": 8},
		{Timestamp: 1000, Values: [3]string{"DE", "", ""}}: {"sessions": 2},
		{Timestamp: 2000, Values: [3]string{"US", "", ""}}: {"sessions": 15},
	}

	result := BuildTimeseriesSeriesMap(data, []string{"userCountry"}, []string{"sessions"})

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
