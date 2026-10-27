package team

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gorilla/mux"

	config "openreplay/backend/internal/config/api"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/server/user"
)

func TestInviteRequestNormalize(t *testing.T) {
	tests := []struct {
		name     string
		req      InviteRequest
		wantName string
		wantMail string
		wantErr  bool
	}{
		{"defaults name to email", InviteRequest{Email: "  Ana@Example.COM "}, "ana@example.com", "ana@example.com", false},
		{"collapses name", InviteRequest{Name: "  Ana   María ", Email: "ana@example.com"}, "Ana María", "ana@example.com", false},
		{"rejects update through invite", InviteRequest{UserID: optionalID{value: new(int64)}, Email: "a@b.co"}, "", "", true},
		{"rejects bad email", InviteRequest{Email: "not-an-email"}, "", "", true},
		{"rejects display-name email", InviteRequest{Email: "Ana <ana@example.com>"}, "", "", true},
		{"rejects control characters", InviteRequest{Name: "a\u0000b", Email: "a@b.co"}, "", "", true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := tt.req
			err := req.Normalize()
			if (err != nil) != tt.wantErr {
				t.Fatalf("got error %v, wantErr %v", err, tt.wantErr)
			}
			if err == nil && (req.Name != tt.wantName || req.Email != tt.wantMail) {
				t.Fatalf("got (%q, %q), want (%q, %q)", req.Name, req.Email, tt.wantName, tt.wantMail)
			}
		})
	}
}

func TestOptionalIDDecoding(t *testing.T) {
	tests := []struct {
		body    string
		want    int64
		wantErr bool
	}{
		{`{"name":"x","email":"x@y.co","admin":false,"roleId":""}`, 0, false},
		{`{"email":"x@y.co","roleId":null}`, 0, false},
		{`{"email":"x@y.co"}`, 0, false},
		{`{"email":"x@y.co","roleId":7}`, 7, false},
		{`{"email":"x@y.co","roleId":"7"}`, 7, false},
		{`{"email":"x@y.co","roleId":"abc"}`, 0, true},
		{`{"email":"x@y.co","roleId":-3}`, 0, true},
	}
	for _, tt := range tests {
		req := &InviteRequest{}
		err := json.Unmarshal([]byte(tt.body), req)
		if (err != nil) != tt.wantErr {
			t.Fatalf("%s: got error %v, wantErr %v", tt.body, err, tt.wantErr)
		}
		if err != nil {
			continue
		}
		got := int64(0)
		if req.RoleID.value != nil {
			got = *req.RoleID.value
		}
		if got != tt.want {
			t.Fatalf("%s: got roleId %d, want %d", tt.body, got, tt.want)
		}
	}
}

func TestInvitationLinkAndToken(t *testing.T) {
	s := &teamImpl{cfg: &config.Config{SiteURL: "https://or.example.com/", InvitationLink: "/api/users/invitation?token=%s"}}
	if got := s.invitationLink("abc"); got != "https://or.example.com/api/users/invitation?token=abc" {
		t.Fatalf("unexpected link %q", got)
	}
	token, err := newInvitationToken()
	if err != nil {
		t.Fatalf("token: %s", err)
	}
	if len(token) != 86 || strings.ContainsAny(token, "+/=") {
		t.Fatalf("token must match Python's token_urlsafe(64), got %q", token)
	}
}

type fakeMailer struct {
	configured bool
	to, subj   string
	body       string
}

func (m *fakeMailer) Configured() bool { return m.configured }

func (m *fakeMailer) Send(_ context.Context, to, subject, html string) error {
	m.to, m.subj, m.body = to, subject, html
	return nil
}

func TestSendInvitation(t *testing.T) {
	mailer := &fakeMailer{configured: true}
	s := &teamImpl{log: logger.New(), mailer: mailer}
	s.sendInvitation("ana@example.com", "https://or.example.com/api/users/invitation?token=t&x=1", "Acme <Corp>", "Bob")

	if mailer.to != "ana@example.com" || mailer.subj != invitationSubject {
		t.Fatalf("unexpected envelope: %q %q", mailer.to, mailer.subj)
	}
	for _, want := range []string{"invited by Bob to join Acme &lt;Corp&gt; team", "token=t&amp;x=1", "cid:img-0"} {
		if !strings.Contains(mailer.body, want) {
			t.Fatalf("body is missing %q", want)
		}
	}
	if strings.Contains(mailer.body, "%(") {
		t.Fatalf("unreplaced placeholder left in body")
	}

	unconfigured := &fakeMailer{}
	(&teamImpl{log: logger.New(), mailer: unconfigured}).sendInvitation("a@b.co", "l", "t", "s")
	if unconfigured.to != "" {
		t.Fatalf("must not send without smtp")
	}
}

type fakeTeam struct {
	Team
	called bool
	err    error
}

func (f *fakeTeam) List(context.Context, uint64) ([]*Member, error) {
	f.called = true
	return make([]*Member, 0), f.err
}

func (f *fakeTeam) TransferOwnership(context.Context, *user.User, int64) (*Member, error) {
	f.called = true
	return &Member{}, f.err
}

func (f *fakeTeam) Update(_ context.Context, _ *user.User, _ int64, req *UpdateRequest) (*Member, error) {
	f.called = true
	return &Member{Name: req.Name}, f.err
}

func newRequest(role string, vars map[string]string, body string) *api.RequestContext {
	r := httptest.NewRequest(http.MethodPost, "/", nil)
	r = r.WithContext(context.WithValue(r.Context(), "userData", &user.User{ID: 1, Role: role}))
	r = mux.SetURLVars(r, vars)
	return &api.RequestContext{Request: r, Body: []byte(body)}
}

func TestMemberRoutesRequireAdmin(t *testing.T) {
	for _, role := range []string{"member", "service", ""} {
		svc := &fakeTeam{}
		h := &handlersImpl{log: logger.New(), team: svc}
		calls := map[string]func(*api.RequestContext) (any, int, error){
			"list": h.listMembers, "invite": h.inviteMember, "update": h.updateMember,
			"delete": h.deleteMember, "reset": h.resetInvitation, "owner": h.transferOwnership,
		}
		for name, call := range calls {
			_, code, err := call(newRequest(role, map[string]string{"memberId": "2"}, `{"email":"a@b.co"}`))
			if code != http.StatusUnauthorized || !errors.Is(err, errRoleRequired) || svc.called {
				t.Fatalf("%s as %q: got %d %v called=%v", name, role, code, err, svc.called)
			}
		}
	}
}

func TestOwnershipTransferIsOwnerOnly(t *testing.T) {
	svc := &fakeTeam{}
	h := &handlersImpl{log: logger.New(), team: svc}
	if _, code, _ := h.transferOwnership(newRequest("admin", map[string]string{"memberId": "2"}, "")); code != http.StatusUnauthorized || svc.called {
		t.Fatalf("admins must not transfer ownership, got %d", code)
	}
	if _, code, _ := h.transferOwnership(newRequest("owner", map[string]string{"memberId": "2"}, "")); code != 0 || !svc.called {
		t.Fatalf("owner must be able to transfer, got %d", code)
	}
}

func TestErrorMapping(t *testing.T) {
	tests := []struct {
		err      error
		wantCode int
		wantMsg  string
	}{
		{notFound("member not found"), http.StatusNotFound, "member not found"},
		{badRequest("cannot change your own role"), http.StatusBadRequest, "cannot change your own role"},
		{errors.New("pq: deadlock detected"), http.StatusInternalServerError, "internal server error"},
	}
	for _, tt := range tests {
		h := &handlersImpl{log: logger.New(), team: &fakeTeam{err: tt.err}}
		_, code, err := h.updateMember(newRequest("admin", map[string]string{"memberId": "3"}, `{"name":"x"}`))
		if code != tt.wantCode || err.Error() != tt.wantMsg {
			t.Fatalf("%v: got (%d, %v), want (%d, %s)", tt.err, code, err, tt.wantCode, tt.wantMsg)
		}
	}
}

func TestInvalidMemberID(t *testing.T) {
	h := &handlersImpl{log: logger.New(), team: &fakeTeam{}}
	for _, id := range []string{"0", "-1", "abc", "99999999999"} {
		if _, code, _ := h.deleteMember(newRequest("owner", map[string]string{"memberId": id}, "")); code != http.StatusBadRequest {
			t.Fatalf("id %q: got %d, want 400", id, code)
		}
	}
}
