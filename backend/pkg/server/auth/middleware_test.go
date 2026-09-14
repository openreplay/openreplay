package auth

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gorilla/mux"

	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/server/user"
	"openreplay/backend/pkg/spot/keys"
)

type rejectingUsers struct{}

func (rejectingUsers) Get(string, string, user.TokenType) (*user.User, error) {
	return nil, fmt.Errorf("no jwt")
}
func (rejectingUsers) GetServiceAccount(uint64) (*user.User, error) {
	return nil, fmt.Errorf("no service account")
}

type recordingKeys struct {
	gotKey    string
	gotSpotID uint64
	user      *user.User
	err       error
}

func (k *recordingKeys) Set(uint64, uint64, *user.User) (*keys.Key, error) { return nil, nil }
func (k *recordingKeys) Get(uint64, *user.User) (*keys.Key, error)         { return nil, nil }
func (k *recordingKeys) IsValid(key string, spotID uint64) (*user.User, error) {
	k.gotKey, k.gotSpotID = key, spotID
	return k.user, k.err
}

func serveSpotRoute(t *testing.T, k keys.Keys, target string) (*httptest.ResponseRecorder, bool) {
	t.Helper()
	a := &authImpl{log: logger.New(), users: rejectingUsers{}, keys: k}
	reached := false
	r := mux.NewRouter()
	r.Use(a.Middleware)
	r.HandleFunc("/spots/{id}", func(w http.ResponseWriter, r *http.Request) { reached = true }).Methods("GET")
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, httptest.NewRequest("GET", target, nil))
	return rec, reached
}

func TestMiddlewarePassesRequestedSpotIDToKeyCheck(t *testing.T) {
	k := &recordingKeys{user: &user.User{ID: 7, TenantID: 1, AuthMethod: "public-key"}}
	rec, reached := serveSpotRoute(t, k, "/spots/4012392954161911296?key=key-a")

	if rec.Code != http.StatusOK || !reached {
		t.Fatalf("expected handler to run, got %d reached=%v", rec.Code, reached)
	}
	if k.gotKey != "key-a" || k.gotSpotID != 4012392954161911296 {
		t.Fatalf("key check got key=%q spot=%d", k.gotKey, k.gotSpotID)
	}
}

func TestMiddlewareRejectsKeyForAnotherSpot(t *testing.T) {
	k := &recordingKeys{err: fmt.Errorf("key not found")}
	rec, reached := serveSpotRoute(t, k, "/spots/4012392954161911296?key=key-a")

	if rec.Code != http.StatusUnauthorized || reached {
		t.Fatalf("expected 401 without reaching handler, got %d reached=%v", rec.Code, reached)
	}
}
