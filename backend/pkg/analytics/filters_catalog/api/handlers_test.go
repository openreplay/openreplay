package api

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"net/url"
	"reflect"
	"testing"

	"openreplay/backend/pkg/analytics/filters_catalog"
	"openreplay/backend/pkg/analytics/filters_catalog/model"
	"openreplay/backend/pkg/assist"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/projects"
	serverapi "openreplay/backend/pkg/server/api"
)

type autocompleteProjects struct {
	projects.Projects
	get func(uint32) (*projects.Project, error)
}

func (p autocompleteProjects) GetProject(id uint32) (*projects.Project, error) {
	return p.get(id)
}

type autocompleteAssist struct {
	assist.Assist
	call func(uint32, string, string) ([]map[string]interface{}, error)
}

func (a autocompleteAssist) Autocomplete(id uint32, q, key string) ([]map[string]interface{}, error) {
	return a.call(id, q, key)
}

type autocompleteLogger struct{ logger.Logger }

func (autocompleteLogger) Error(context.Context, string, ...interface{}) {}

func autocompleteRequest(projectID uint32, name, q string, live bool) *serverapi.RequestContext {
	params := url.Values{"propertyName": {name}, "source": {"metadata"}, "ac": {"true"}}
	if live {
		params.Set("live", "true")
	}
	if q != "" {
		params.Set("q", q)
	}
	return &serverapi.RequestContext{
		ProjectID: projectID,
		Request:   httptest.NewRequest(http.MethodGet, "/properties/autocomplete?"+params.Encode(), nil),
	}
}

func TestLiveMetadataAutocompleteUsesConfiguredKey(t *testing.T) {
	tenantKey, userKey, otherTenantKey := "tenant_id", "user_name", "support_group"
	firstKey, lastKey := "application", "tenant_vertical"
	projectByID := map[uint32]*projects.Project{
		3: {Metadata1: &firstKey, Metadata5: &userKey, Metadata7: &tenantKey, Metadata10: &lastKey},
		4: {Metadata7: &otherTenantKey},
	}
	for _, tc := range []struct {
		name      string
		projectID uint32
		property  string
		q         string
		wantKey   string
	}{
		{"tenant without query", 3, "metadata_7", "", tenantKey},
		{"tenant with query", 3, "metadata_7", "demo", tenantKey},
		{"user without query", 3, "metadata_5", "", userKey},
		{"user with query", 3, "metadata_5", "demo", userKey},
		{"same slot in another project", 4, "metadata_7", "", otherTenantKey},
		{"first slot", 3, "metadata_1", "", firstKey},
		{"last slot", 3, "metadata_10", "", lastKey},
	} {
		t.Run(tc.name, func(t *testing.T) {
			calls := 0
			want := []map[string]interface{}{{"value": "demo"}}
			h := handlersImpl{
				projects: autocompleteProjects{get: func(id uint32) (*projects.Project, error) {
					return projectByID[id], nil
				}},
				assist: autocompleteAssist{call: func(id uint32, q, key string) ([]map[string]interface{}, error) {
					calls++
					if id != tc.projectID || q != tc.q || key != tc.wantKey {
						t.Errorf("Assist received (%d, %q, %q), want (%d, %q, %q)", id, q, key, tc.projectID, tc.q, tc.wantKey)
						return []map[string]interface{}{}, nil
					}
					return want, nil
				}},
			}
			got, status, err := h.autocompleteProperties(autocompleteRequest(tc.projectID, tc.property, tc.q, true))
			if err != nil || status != 0 || !reflect.DeepEqual(got, want) || calls != 1 {
				t.Fatalf("got (%v, %d, %v), calls=%d; want suggestions and one Assist call", got, status, err, calls)
			}
		})
	}
}

func TestLiveMetadataAutocompleteUnconfiguredSlot(t *testing.T) {
	empty := ""
	for _, project := range []*projects.Project{{}, {Metadata7: &empty}} {
		h := handlersImpl{
			projects: autocompleteProjects{get: func(uint32) (*projects.Project, error) { return project, nil }},
			assist: autocompleteAssist{call: func(uint32, string, string) ([]map[string]interface{}, error) {
				t.Fatal("unconfigured slot must not query Assist")
				return nil, nil
			}},
		}
		got, status, err := h.autocompleteProperties(autocompleteRequest(3, "metadata_7", "", true))
		if err != nil || status != 0 || !reflect.DeepEqual(got, []map[string]interface{}{}) {
			t.Fatalf("got (%v, %d, %v), want empty suggestions", got, status, err)
		}
	}
}

func TestLiveMetadataAutocompleteInvalidSlot(t *testing.T) {
	for _, name := range []string{"metadata_0", "metadata_11", "metadata_", "metadata_x", "metadata_-1", "metadata_07", "metadata_+7"} {
		t.Run(name, func(t *testing.T) {
			h := handlersImpl{}
			_, status, err := h.autocompleteProperties(autocompleteRequest(3, name, "", true))
			if err == nil || status != http.StatusBadRequest {
				t.Fatalf("got status=%d err=%v, want bad request", status, err)
			}
		})
	}
}

func TestLiveMetadataAutocompleteProjectLookupFailure(t *testing.T) {
	for _, lookupErr := range []error{errors.New("project unavailable"), nil} {
		h := handlersImpl{
			log: autocompleteLogger{},
			projects: autocompleteProjects{get: func(uint32) (*projects.Project, error) {
				return nil, lookupErr
			}},
		}
		_, status, err := h.autocompleteProperties(autocompleteRequest(3, "metadata_7", "", true))
		if status != http.StatusInternalServerError || !errors.Is(err, errAutocompleteFailed) {
			t.Fatalf("got status=%d err=%v, want autocomplete failure", status, err)
		}
	}
}

func TestLiveAutocompleteOrdinaryPropertyUnchanged(t *testing.T) {
	want := []map[string]interface{}{{"value": "demo"}}
	h := handlersImpl{assist: autocompleteAssist{call: func(id uint32, q, key string) ([]map[string]interface{}, error) {
		if id != 3 || q != "demo" || key != "userId" {
			t.Fatalf("unexpected Assist arguments: %d %q %q", id, q, key)
		}
		return want, nil
	}}}
	got, status, err := h.autocompleteProperties(autocompleteRequest(3, "userId", "demo", true))
	if err != nil || status != 0 || !reflect.DeepEqual(got, want) {
		t.Fatalf("got (%v, %d, %v), want unchanged suggestions", got, status, err)
	}
}

type recordedAutocompleteCatalog struct {
	filters_catalog.FiltersCatalog
	t *testing.T
}

func (s recordedAutocompleteCatalog) SearchPropertiesAutocomplete(_ context.Context, id uint32, property, event, user, source, q string, ac bool) ([]model.AutocompleteRow, error) {
	if id != 3 || property != "metadata_7" || event != "" || user != "" || source != "metadata" || q != "demo" || !ac {
		s.t.Fatalf("recorded autocomplete arguments changed: %d %q %q %q %q %q %v", id, property, event, user, source, q, ac)
	}
	return []model.AutocompleteRow{{Value: "demo"}}, nil
}

func TestRecordedMetadataAutocompleteKeepsInternalSlot(t *testing.T) {
	h := handlersImpl{service: recordedAutocompleteCatalog{t: t}}
	got, status, err := h.autocompleteProperties(autocompleteRequest(3, "metadata_7", "demo", false))
	want := []model.AutocompleteRow{{Value: "demo"}}
	if err != nil || status != 0 || !reflect.DeepEqual(got, want) {
		t.Fatalf("got (%v, %d, %v), want recorded suggestions", got, status, err)
	}
}
