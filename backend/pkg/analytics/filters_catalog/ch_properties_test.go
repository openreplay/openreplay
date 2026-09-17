package filters_catalog

import (
	"reflect"
	"testing"
)

func TestBuildPropertiesCatalogSection_PredefinedPossibleValuesCarriedOver(t *testing.T) {
	fetched := []propertyCatalogRow{
		{
			Total:         1,
			Name:          "method",
			DisplayName:   "HTTP Method",
			AutoCaptured:  false,
			PossibleTypes: []string{"String"},
		},
	}

	section := buildPropertiesCatalogSection(fetched)

	var item map[string]any
	for _, entry := range section.List {
		m, ok := entry.(map[string]any)
		if !ok {
			t.Fatalf("expected item to be map[string]any, got %T", entry)
		}
		if m["name"] == "method" {
			item = m
			break
		}
	}
	if item == nil {
		t.Fatalf("expected an item named %q in the section list", "method")
	}

	if _, present := item["isPredefined"]; present {
		t.Fatalf("expected CH-sourced item to not have isPredefined key")
	}

	want := PredefinedProperties["method"].PossibleValues
	got, ok := item["possibleValues"]
	if !ok {
		t.Fatalf("expected possibleValues key to be present")
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("possibleValues = %v, want %v", got, want)
	}
}
