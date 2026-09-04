package api_key

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gorilla/mux"

	"openreplay/backend/pkg/analytics/events"
	eventsModel "openreplay/backend/pkg/analytics/events/model"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/projects"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/server/tenant"
)

type stubProjects struct{ projects.Projects }

func (stubProjects) GetProjectByKeyAndTenant(string, int) (*projects.Project, error) {
	return &projects.Project{ProjectID: 17483}, nil
}

type recordingEvents struct {
	events.Events
	calls int
	req   *eventsModel.EventsSearchRequest
}

func (e *recordingEvents) SearchEvents(_ context.Context, _ uint32, req *eventsModel.EventsSearchRequest) (*eventsModel.EventsSearchResponse, error) {
	e.calls++
	e.req = req
	return &eventsModel.EventsSearchResponse{}, nil
}

func newSearchEventsRequest(sessionID string) *api.RequestContext {
	body := `{"startTimestamp":1787904000000,"endTimestamp":1788508800000,"limit":10,"page":1}`
	r := httptest.NewRequest(http.MethodPost, "/v2/public/mkALTp5tKndNCVDQl77M/sessions/"+sessionID+"/events", strings.NewReader(body))
	r = mux.SetURLVars(r, map[string]string{"project": "mkALTp5tKndNCVDQl77M", "sessionID": sessionID})
	r = r.WithContext(context.WithValue(r.Context(), "tenantData", &tenant.Tenant{TenantID: 1}))
	return &api.RequestContext{Request: r, Body: []byte(body)}
}

func TestSearchEventsBySession_NonNumericSessionIDIs400(t *testing.T) {
	ev := &recordingEvents{}
	h := &handlersImpl{log: logger.New(), projects: stubProjects{}, events: ev}

	_, status, err := h.searchEventsBySession(newSearchEventsRequest("atr-deploy-evidence-20260811090955"))

	if status != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400 (err=%v)", status, err)
	}
	if err == nil {
		t.Fatal("expected an error describing the invalid sessionID")
	}
	if ev.calls != 0 {
		t.Fatalf("SearchEvents was called %d times for an invalid sessionID", ev.calls)
	}
}

func TestSearchEventsBySession_NumericSessionIDReachesSearch(t *testing.T) {
	ev := &recordingEvents{}
	h := &handlersImpl{log: logger.New(), projects: stubProjects{}, events: ev}

	_, status, err := h.searchEventsBySession(newSearchEventsRequest("3991306397286400001"))

	if err != nil || status != 0 {
		t.Fatalf("unexpected result: status=%d err=%v", status, err)
	}
	if ev.calls != 1 {
		t.Fatalf("SearchEvents calls = %d, want 1", ev.calls)
	}
	var found bool
	for _, f := range ev.req.Filters {
		if f.Name == "session_id" && len(f.Value) == 1 && f.Value[0] == "3991306397286400001" {
			found = true
		}
	}
	if !found {
		t.Fatalf("session_id filter not forwarded: %+v", ev.req.Filters)
	}
}
