package team

import (
	"encoding/json"
	"errors"
	"net/http"

	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/server/user"
)

var (
	errRoleRequired = errors.New("You need a different role to access this resource")
	errInternal     = errors.New("internal server error")
	errInvalidBody  = errors.New("invalid request body")
	errInvalidID    = errors.New("invalid id")
)

type handlersImpl struct {
	log      logger.Logger
	team     Team
	handlers []*api.Description
}

func NewHandlers(log logger.Logger, req api.RequestHandler, team Team) (api.Handlers, error) {
	h := &handlersImpl{
		log:  log,
		team: team,
	}
	h.handlers = append([]*api.Description{
		{"/client/members", "GET", req.Handle(h.listMembers), api.NoPermissions, api.DoNotTrack},
		{"/client/members", "POST", req.HandleWithBody(h.inviteMember), api.NoPermissions, "add_member"},
		{"/client/members/{memberId}", "PUT", req.HandleWithBody(h.updateMember), api.NoPermissions, "edit_member"},
		{"/client/members/{memberId}", "DELETE", req.Handle(h.deleteMember), api.NoPermissions, "delete_member"},
		{"/client/members/{memberId}/reset", "GET", req.Handle(h.resetInvitation), api.NoPermissions, "reset_reinvite_member"},
		{"/client/members/{memberId}/owner", "PUT", req.Handle(h.transferOwnership), api.NoPermissions, "transfer_ownership"},
	}, h.editionHandlers(req)...)
	return h, nil
}

func (h *handlersImpl) GetAll() []*api.Description {
	return h.handlers
}

func (h *handlersImpl) fail(r *api.RequestContext, action string, err error) (any, int, error) {
	var teamErr *Error
	if errors.As(err, &teamErr) {
		return nil, teamErr.Status, teamErr
	}
	h.log.Error(r.Request.Context(), "failed to %s: %s", action, err)
	return nil, http.StatusInternalServerError, errInternal
}

func adminUser(r *api.RequestContext) (*user.User, error) {
	u := api.GetUser(r.Request)
	if !u.IsAdmin() {
		return nil, errRoleRequired
	}
	return u, nil
}

func pathID(r *api.RequestContext, key string) (int64, error) {
	id, err := api.GetPathParam(r.Request, key, api.ParseUint32)
	if err != nil || id == 0 {
		return 0, errInvalidID
	}
	return int64(id), nil
}

func (h *handlersImpl) listMembers(r *api.RequestContext) (any, int, error) {
	u, err := adminUser(r)
	if err != nil {
		return nil, http.StatusUnauthorized, err
	}
	members, err := h.team.List(r.Request.Context(), u.TenantID)
	if err != nil {
		return h.fail(r, "list members", err)
	}
	return members, 0, nil
}

func (h *handlersImpl) inviteMember(r *api.RequestContext) (any, int, error) {
	u, err := adminUser(r)
	if err != nil {
		return nil, http.StatusUnauthorized, err
	}
	req := &InviteRequest{}
	if err := json.Unmarshal(r.Body, req); err != nil {
		return nil, http.StatusBadRequest, errInvalidBody
	}
	if err := req.Normalize(); err != nil {
		return nil, http.StatusBadRequest, err
	}
	member, err := h.team.Invite(r.Request.Context(), u, req)
	if err != nil {
		return h.fail(r, "invite member", err)
	}
	return member, 0, nil
}

func (h *handlersImpl) updateMember(r *api.RequestContext) (any, int, error) {
	u, err := adminUser(r)
	if err != nil {
		return nil, http.StatusUnauthorized, err
	}
	memberID, err := pathID(r, "memberId")
	if err != nil {
		return nil, http.StatusBadRequest, err
	}
	req := &UpdateRequest{}
	if err := json.Unmarshal(r.Body, req); err != nil {
		return nil, http.StatusBadRequest, errInvalidBody
	}
	if err := req.Normalize(); err != nil {
		return nil, http.StatusBadRequest, err
	}
	member, err := h.team.Update(r.Request.Context(), u, memberID, req)
	if err != nil {
		return h.fail(r, "update member", err)
	}
	return member, 0, nil
}

func (h *handlersImpl) deleteMember(r *api.RequestContext) (any, int, error) {
	u, err := adminUser(r)
	if err != nil {
		return nil, http.StatusUnauthorized, err
	}
	memberID, err := pathID(r, "memberId")
	if err != nil {
		return nil, http.StatusBadRequest, err
	}
	members, err := h.team.Delete(r.Request.Context(), u, memberID)
	if err != nil {
		return h.fail(r, "delete member", err)
	}
	return members, 0, nil
}

func (h *handlersImpl) resetInvitation(r *api.RequestContext) (any, int, error) {
	u, err := adminUser(r)
	if err != nil {
		return nil, http.StatusUnauthorized, err
	}
	memberID, err := pathID(r, "memberId")
	if err != nil {
		return nil, http.StatusBadRequest, err
	}
	link, err := h.team.ResetInvitation(r.Request.Context(), u.TenantID, memberID)
	if err != nil {
		return h.fail(r, "reset invitation", err)
	}
	return link, 0, nil
}

func (h *handlersImpl) transferOwnership(r *api.RequestContext) (any, int, error) {
	u := api.GetUser(r.Request)
	if u.Role != "owner" {
		return nil, http.StatusUnauthorized, errRoleRequired
	}
	memberID, err := pathID(r, "memberId")
	if err != nil {
		return nil, http.StatusBadRequest, err
	}
	member, err := h.team.TransferOwnership(r.Request.Context(), u, memberID)
	if err != nil {
		return h.fail(r, "transfer ownership", err)
	}
	return member, 0, nil
}
