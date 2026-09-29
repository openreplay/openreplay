package api

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gorilla/mux"
)

func requestWithVars(t *testing.T, vars map[string]string) *http.Request {
	t.Helper()
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	if vars != nil {
		r = mux.SetURLVars(r, vars)
	}
	return r
}

func TestGetPathParamDefaultOnlyForMissing(t *testing.T) {
	cases := []struct {
		name    string
		vars    map[string]string
		wantVal uint32
		wantErr bool
	}{
		{"missing returns default", map[string]string{}, 7, false},
		{"empty returns default", map[string]string{"projectId": ""}, 7, false},
		{"valid parses", map[string]string{"projectId": "42"}, 42, false},
		{"plus prefix errors, does not fall back to default", map[string]string{"projectId": "+42"}, 0, true},
		{"negative errors", map[string]string{"projectId": "-42"}, 0, true},
		{"overflow errors", map[string]string{"projectId": "4294967301"}, 0, true},
		{"garbage errors", map[string]string{"projectId": "42abc"}, 0, true},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			r := requestWithVars(t, c.vars)
			got, err := GetPathParam(r, "projectId", ParseUint32, uint32(7))
			if c.wantErr {
				if err == nil {
					t.Fatalf("expected error, got value %d", got)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %s", err)
			}
			if got != c.wantVal {
				t.Fatalf("got %d, want %d", got, c.wantVal)
			}
		})
	}
}

func TestGetPathParamNoDefault(t *testing.T) {
	r := requestWithVars(t, map[string]string{})
	if _, err := GetPathParam(r, "projectId", ParseUint32); err == nil {
		t.Fatalf("expected error for missing param without a default")
	}
	r = requestWithVars(t, map[string]string{"projectId": "+42"})
	if _, err := GetPathParam(r, "projectId", ParseUint32); err == nil {
		t.Fatalf("expected error for malformed param without a default")
	}
}

func TestGetProjectResolution(t *testing.T) {
	cases := []struct {
		name    string
		vars    map[string]string
		wantID  uint32
		wantErr bool
		wantNo  bool // expect ErrNoProjectInPath specifically
	}{
		{"no project var", map[string]string{}, 0, true, true},
		{"empty vars", map[string]string{"projectId": "", "project": ""}, 0, true, true},
		{"projectId valid", map[string]string{"projectId": "42"}, 42, false, false},
		{"project alias valid", map[string]string{"project": "42"}, 42, false, false},
		{"projectId preferred over project", map[string]string{"projectId": "42", "project": "99"}, 42, false, false},
		{"empty projectId falls back to project", map[string]string{"projectId": "", "project": "42"}, 42, false, false},
		{"leading zero parses to its value", map[string]string{"projectId": "042"}, 42, false, false},
		{"plus prefix rejected", map[string]string{"projectId": "+42"}, 0, true, false},
		{"negative rejected", map[string]string{"projectId": "-42"}, 0, true, false},
		{"overflow rejected", map[string]string{"projectId": "4294967301"}, 0, true, false},
		{"zero rejected", map[string]string{"projectId": "0"}, 0, true, false},
		{"garbage rejected", map[string]string{"projectId": "42abc"}, 0, true, false},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			r := requestWithVars(t, c.vars)
			id, err := GetProject(r)
			if c.wantErr {
				if err == nil {
					t.Fatalf("expected error, got id=%d", id)
				}
				if c.wantNo && !errors.Is(err, ErrNoProjectInPath) {
					t.Fatalf("expected ErrNoProjectInPath, got: %s", err)
				}
				if !c.wantNo && errors.Is(err, ErrNoProjectInPath) {
					t.Fatalf("expected a malformed-id error, got ErrNoProjectInPath")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %s", err)
			}
			if id != c.wantID {
				t.Fatalf("id: got %d, want %d", id, c.wantID)
			}
		})
	}
}
