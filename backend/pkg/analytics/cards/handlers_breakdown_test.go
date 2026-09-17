package cards

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-playground/validator/v10"
	"github.com/gorilla/mux"

	"openreplay/backend/pkg/analytics/model"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/server/user"
)

type fakeCards struct {
	created bool
	updated bool
}

func (f *fakeCards) Create(projectID int, userID uint64, req *CardCreateRequest) (*CardGetResponse, error) {
	f.created = true
	return &CardGetResponse{}, nil
}
func (f *fakeCards) Get(projectID int, cardID int64) (*CardGetResponse, error) { return nil, nil }
func (f *fakeCards) GetWithSeries(projectID int, cardID int64) (*CardGetResponse, error) {
	return nil, nil
}
func (f *fakeCards) GetAll(projectID int) (*GetCardsResponse, error) { return nil, nil }
func (f *fakeCards) GetAllPaginated(projectID int, filters CardListFilter, sort CardListSort, limit, offset int) (*GetCardsResponsePaginated, error) {
	return nil, nil
}
func (f *fakeCards) Update(projectID int, cardID int64, userID uint64, req *CardUpdateRequest) (*CardGetResponse, error) {
	f.updated = true
	return &CardGetResponse{}, nil
}
func (f *fakeCards) Delete(projectID int, cardID int64, userID uint64) error { return nil }

type fakeLogger struct{}

func (fakeLogger) Debug(ctx context.Context, message string, args ...interface{}) {}
func (fakeLogger) Info(ctx context.Context, message string, args ...interface{})  {}
func (fakeLogger) Warn(ctx context.Context, message string, args ...interface{})  {}
func (fakeLogger) Error(ctx context.Context, message string, args ...interface{}) {}
func (fakeLogger) Fatal(ctx context.Context, message string, args ...interface{}) {}

type fakeResponser struct {
	lastCode int
	lastErr  error
	ok       bool
}

func (f *fakeResponser) ResponseOK(log logger.Logger, ctx context.Context, w http.ResponseWriter, requestStart time.Time, url string, bodySize int) {
	f.ok = true
	w.WriteHeader(http.StatusOK)
}
func (f *fakeResponser) ResponseWithJSON(log logger.Logger, ctx context.Context, w http.ResponseWriter, res interface{}, requestStart time.Time, url string, bodySize int) {
	f.ok = true
	w.WriteHeader(http.StatusOK)
}
func (f *fakeResponser) ResponseWithError(log logger.Logger, ctx context.Context, w http.ResponseWriter, code int, err error, requestStart time.Time, url string, bodySize int) {
	f.lastCode = code
	f.lastErr = err
	w.WriteHeader(code)
}

func newTestHandlers(fc *fakeCards, fr *fakeResponser, validateBreakdowns func([]model.Breakdown) error) *handlersImpl {
	return &handlersImpl{
		log:                fakeLogger{},
		responser:          fr,
		jsonSizeLimit:      1 << 20,
		cards:              fc,
		validator:          validator.New(),
		validateBreakdowns: validateBreakdowns,
	}
}

func validCardBody(breakdownsJSON string) string {
	return `{
		"name": "n",
		"metricType": "timeseries",
		"metricFormat": "default",
		"viewType": "lineChart",
		"metricOf": "sessionCount",
		"series": [{"name":"s","filter":{}}],
		"breakdowns": ` + breakdownsJSON + `
	}`
}

func withUser(r *http.Request) *http.Request {
	ctx := context.WithValue(r.Context(), "userData", &user.User{ID: 1})
	return r.WithContext(ctx)
}

func TestCreateCard_RejectsUnknownBreakdownKey(t *testing.T) {
	fc := &fakeCards{}
	fr := &fakeResponser{}
	rejectUnknown := func(bds []model.Breakdown) error {
		for _, b := range bds {
			if b.Name == "nope" {
				return &validator.InvalidValidationError{}
			}
		}
		return nil
	}
	h := newTestHandlers(fc, fr, rejectUnknown)

	body := validCardBody(`[{"name":"nope"}]`)
	req := withUser(httptest.NewRequest(http.MethodPost, "/1/cards", bytes.NewBufferString(body)))
	req = mux.SetURLVars(req, map[string]string{"projectId": "1"})
	w := httptest.NewRecorder()

	h.createCard(w, req)

	if fr.lastCode != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
	if fc.created {
		t.Fatalf("card must not be persisted when breakdown validation fails")
	}
}

func TestCreateCard_RejectsDuplicateAfterCanonicalization(t *testing.T) {
	fc := &fakeCards{}
	fr := &fakeResponser{}
	rejectDup := func(bds []model.Breakdown) error {
		seen := map[string]bool{}
		canon := map[string]string{"issueType": "issue"}
		for _, b := range bds {
			name := b.Name
			if c, ok := canon[name]; ok {
				name = c
			}
			if seen[name] {
				return &validator.InvalidValidationError{}
			}
			seen[name] = true
		}
		return nil
	}
	h := newTestHandlers(fc, fr, rejectDup)

	body := validCardBody(`[{"name":"issue"},{"name":"issueType"}]`)
	req := withUser(httptest.NewRequest(http.MethodPost, "/1/cards", bytes.NewBufferString(body)))
	req = mux.SetURLVars(req, map[string]string{"projectId": "1"})
	w := httptest.NewRecorder()

	h.createCard(w, req)

	if fr.lastCode != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
	if fc.created {
		t.Fatalf("card must not be persisted on duplicate breakdown")
	}
}

func TestCreateCard_AcceptsValidBreakdowns(t *testing.T) {
	fc := &fakeCards{}
	fr := &fakeResponser{}
	acceptAll := func(bds []model.Breakdown) error { return nil }
	h := newTestHandlers(fc, fr, acceptAll)

	body := validCardBody(`[{"name":"planType","isEvent":true},"userCountry"]`)
	req := withUser(httptest.NewRequest(http.MethodPost, "/1/cards", bytes.NewBufferString(body)))
	req = mux.SetURLVars(req, map[string]string{"projectId": "1"})
	w := httptest.NewRecorder()

	h.createCard(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (err=%v)", w.Code, fr.lastErr)
	}
	if !fc.created {
		t.Fatalf("expected card to be persisted")
	}
}

func TestUpdateCard_RejectsUnknownBreakdownKey(t *testing.T) {
	fc := &fakeCards{}
	fr := &fakeResponser{}
	rejectUnknown := func(bds []model.Breakdown) error {
		for _, b := range bds {
			if b.Name == "nope" {
				return &validator.InvalidValidationError{}
			}
		}
		return nil
	}
	h := newTestHandlers(fc, fr, rejectUnknown)

	body := validCardBody(`[{"name":"nope"}]`)
	req := withUser(httptest.NewRequest(http.MethodPut, "/1/cards/2", bytes.NewBufferString(body)))
	req = mux.SetURLVars(req, map[string]string{"projectId": "1", "id": "2"})
	w := httptest.NewRecorder()

	h.updateCard(w, req)

	if fr.lastCode != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
	if fc.updated {
		t.Fatalf("card must not be persisted when breakdown validation fails")
	}
}
