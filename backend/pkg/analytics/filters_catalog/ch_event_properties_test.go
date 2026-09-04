package filters_catalog

import (
	"testing"
)

func findByName(items []map[string]any, name string) map[string]any {
	for _, it := range items {
		if it["name"] == name {
			return it
		}
	}
	return nil
}

func TestBuildEventPropertiesPredefinedAndDefault(t *testing.T) {
	rows := []eventPropertyRow{
		{Name: "label", DisplayName: nil, AutoCaptured: true, PossibleTypes: []string{"String", "LowCardinality(String)"}},
		{Name: "custom_thing", DisplayName: strPtr("Custom"), AutoCaptured: true, PossibleTypes: []string{"UInt32"}},
	}
	got := buildEventProperties(rows, "CLICK", true)
	if len(got) != 2 {
		t.Fatalf("len = %d, want 2", len(got))
	}
	label := findByName(got, "label")
	if label == nil {
		t.Fatal("label missing")
	}
	if label["defaultProperty"] != true {
		t.Errorf("label.defaultProperty = %v, want true", label["defaultProperty"])
	}
	if label["_foundInPredefinedList"] != true || label["dataType"] != "string" {
		t.Errorf("label predefined metadata wrong: %v", label)
	}
	if label["displayName"] == nil || label["displayName"] == "" {
		t.Errorf("label.displayName should fall back to OR display name, got %v", label["displayName"])
	}
	if label["category"] != "events" || label["id"] != StringToID("prop_label") {
		t.Errorf("label id/category wrong: %v", label)
	}
	if pt := label["possibleTypes"].([]string); len(pt) != 1 || pt[0] != "string" {
		t.Errorf("label.possibleTypes = %v, want [string]", pt)
	}
	custom := findByName(got, "custom_thing")
	if custom == nil {
		t.Fatal("custom_thing missing")
	}
	if custom["defaultProperty"] != false || custom["_foundInPredefinedList"] != false || custom["isPredefined"] != false {
		t.Errorf("custom_thing flags wrong: %v", custom)
	}
	if _, has := custom["dataType"]; has {
		t.Errorf("custom_thing should not carry dataType: %v", custom)
	}
	if custom["displayName"] != "Custom" {
		t.Errorf("custom_thing.displayName = %v", custom["displayName"])
	}
}

func TestBuildEventPropertiesCamelCasesPredefinedNames(t *testing.T) {
	rows := []eventPropertyRow{{Name: "url_path", AutoCaptured: true, PossibleTypes: []string{"String"}}}
	got := buildEventProperties(rows, "LOCATION", true)
	if got[0]["name"] != "urlPath" || got[0]["id"] != StringToID("prop_urlPath") {
		t.Errorf("expected camelCased name/id, got %v", got[0])
	}
	if got[0]["defaultProperty"] != true {
		t.Errorf("urlPath should be default for LOCATION")
	}
}

func TestBuildEventPropertiesCustomEventFirstIsDefault(t *testing.T) {
	rows := []eventPropertyRow{
		{Name: "plan", AutoCaptured: false, PossibleTypes: []string{"String"}},
		{Name: "seats", AutoCaptured: false, PossibleTypes: []string{"UInt8"}},
	}
	got := buildEventProperties(rows, "SIGNUP", false)
	if got[0]["defaultProperty"] != true || got[1]["defaultProperty"] != false {
		t.Errorf("first custom property should be default: %v", got)
	}
	if got[0]["displayName"] != nil {
		t.Errorf("non-auto-captured with no display name should be null, got %v", got[0]["displayName"])
	}
}

func TestBuildEventPropertiesEmpty(t *testing.T) {
	got := buildEventProperties(nil, "SIGNUP", false)
	if got == nil || len(got) != 0 {
		t.Errorf("expected empty non-nil slice, got %#v", got)
	}
}

func TestBuildEventPropertiesRequestExtraDuration(t *testing.T) {
	got := buildEventProperties([]eventPropertyRow{{Name: "status", AutoCaptured: true, PossibleTypes: []string{"UInt16"}}}, "REQUEST", true)
	dur := findByName(got, "duration")
	if dur == nil {
		t.Fatal("duration should be appended for REQUEST")
	}
	if dur["dataType"] != "int" || dur["_foundInPredefinedList"] != true || dur["defaultProperty"] != false {
		t.Errorf("duration extra shape wrong: %v", dur)
	}

	got = buildEventProperties([]eventPropertyRow{{Name: "duration", AutoCaptured: true, PossibleTypes: []string{"UInt16"}}}, "REQUEST", true)
	if len(got) != 1 {
		t.Errorf("duration should not be duplicated, got %d items", len(got))
	}
}

func TestGlobalFiltersShape(t *testing.T) {
	got := globalFilters()
	if len(got) != len(GetSessionsFilters().List) {
		t.Fatalf("len = %d, want %d", len(got), len(GetSessionsFilters().List))
	}
	for _, f := range got {
		if f["category"] != "session" || f["defaultProperty"] != false {
			t.Errorf("global filter missing category/defaultProperty: %v", f)
		}
		for _, k := range []string{"id", "name", "displayName", "possibleTypes", "dataType", "autoCaptured", "isPredefined", "possibleValues", "isConditional"} {
			if _, ok := f[k]; !ok {
				t.Errorf("global filter missing key %q: %v", k, f)
			}
		}
	}
}

func TestTagTriggerProperties(t *testing.T) {
	got := tagTriggerProperties([]tagValue{{ID: 7, Name: "Buy"}})
	if len(got) != 1 || got[0]["name"] != "tagId" || got[0]["isPredefined"] != true || got[0]["defaultProperty"] != true {
		t.Fatalf("unexpected tagId shape: %v", got)
	}
	vals := got[0]["possibleValues"].([]any)
	if len(vals) != 1 || vals[0].(map[string]any)["id"] != 7 || vals[0].(map[string]any)["name"] != "Buy" {
		t.Errorf("unexpected possibleValues: %v", vals)
	}
}

func strPtr(s string) *string { return &s }
