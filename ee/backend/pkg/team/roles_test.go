package team

import (
	"net/http"
	"strings"
	"testing"

	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/server/api"
)

func TestRoleRequestNormalize(t *testing.T) {
	f := false
	tests := []struct {
		name    string
		req     RoleRequest
		wantErr string
	}{
		{"defaults to all projects", RoleRequest{Name: "  Support  team ", Permissions: []string{"SESSION_REPLAY", "SESSION_REPLAY"}}, ""},
		{"missing permissions", RoleRequest{Name: "a"}, "permissions is required"},
		{"unknown permission", RoleRequest{Name: "a", Permissions: []string{"AUDITS"}}, `unknown permission "AUDITS"`},
		{"browser tests allowed", RoleRequest{Name: "Support team", Permissions: []string{"BROWSER_TESTS"}}, ""},
		{"service permission rejected", RoleRequest{Name: "a", Permissions: []string{"SERVICE_SESSION_REPLAY"}}, `unknown permission "SERVICE_SESSION_REPLAY"`},
		{"empty name", RoleRequest{Name: "  ", Permissions: []string{}}, "name must be between 1 and 40 characters"},
		{"long name", RoleRequest{Name: strings.Repeat("r", 41), Permissions: []string{}}, "name must be between 1 and 40 characters"},
		{"projects required", RoleRequest{Name: "a", Permissions: []string{}, AllProjects: &f}, "must specify a project or all projects"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := tt.req
			err := req.Normalize()
			if tt.wantErr != "" {
				if err == nil || err.Error() != tt.wantErr {
					t.Fatalf("got %v, want %q", err, tt.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %s", err)
			}
			if req.Name != "Support team" || len(req.Permissions) != 1 || !*req.AllProjects {
				t.Fatalf("unexpected normalized request: %+v", req)
			}
		})
	}
}

type stubRequestHandler struct{}

func (stubRequestHandler) Handle(func(*api.RequestContext) (any, int, error)) http.HandlerFunc {
	return nil
}

func (stubRequestHandler) HandleWithBody(func(*api.RequestContext) (any, int, error)) http.HandlerFunc {
	return nil
}

func TestRoleRoutesRequireAdmin(t *testing.T) {
	h := &handlersImpl{log: logger.New(), team: &fakeTeam{}}
	calls := []func(*api.RequestContext) (any, int, error){h.listRoles, h.createRole, h.updateRole, h.deleteRole}
	for _, call := range calls {
		if _, code, _ := call(newRequest("member", map[string]string{"roleId": "4"}, `{"name":"a","permissions":[]}`)); code != http.StatusUnauthorized {
			t.Fatalf("got %d, want 401", code)
		}
	}
	if got := len(h.editionHandlers(stubRequestHandler{})); got != 6 {
		t.Fatalf("expected 6 role routes in EE, got %d", got)
	}
}
