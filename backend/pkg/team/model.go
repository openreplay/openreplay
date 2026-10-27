package team

import (
	"bytes"
	"errors"
	"fmt"
	"net/http"
	"net/mail"
	"strconv"
	"strings"
	"unicode"
	"unicode/utf8"
)

const (
	maxNameLength  = 320
	maxEmailLength = 320
)

type Error struct {
	Status  int
	Message string
}

func (e *Error) Error() string {
	return e.Message
}

func badRequest(msg string) error {
	return &Error{Status: http.StatusBadRequest, Message: msg}
}

func notFound(msg string) error {
	return &Error{Status: http.StatusNotFound, Message: msg}
}

type Member struct {
	UserID            int64   `json:"userId"`
	Email             string  `json:"email"`
	Role              string  `json:"role"`
	Name              string  `json:"name"`
	CreatedAt         int64   `json:"createdAt"`
	SuperAdmin        bool    `json:"superAdmin"`
	Admin             bool    `json:"admin"`
	Member            bool    `json:"member"`
	ExpiredInvitation bool    `json:"expiredInvitation"`
	Joined            bool    `json:"joined"`
	InvitationLink    *string `json:"invitationLink"`
	RoleID            *int64  `json:"roleId,omitempty"`
	RoleName          *string `json:"roleName,omitempty"`
}

func (m *Member) setRole(role string) {
	m.Role = role
	m.SuperAdmin = role == "owner"
	m.Admin = role == "admin"
	m.Member = role == "member"
}

type optionalID struct {
	value *int64
}

func (id *optionalID) UnmarshalJSON(data []byte) error {
	data = bytes.TrimSpace(data)
	if bytes.Equal(data, []byte("null")) {
		return nil
	}
	raw := string(data)
	if unquoted, err := strconv.Unquote(raw); err == nil {
		raw = strings.TrimSpace(unquoted)
	}
	if raw == "" {
		return nil
	}
	v, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || v <= 0 {
		return errors.New("invalid id")
	}
	id.value = &v
	return nil
}

type InvitationLink struct {
	InvitationLink string `json:"invitationLink"`
}

func normalizeName(name string) (string, error) {
	name = strings.Join(strings.Fields(name), " ")
	if utf8.RuneCountInString(name) > maxNameLength {
		return "", fmt.Errorf("name must be at most %d characters", maxNameLength)
	}
	if strings.IndexFunc(name, unicode.IsControl) >= 0 {
		return "", errors.New("name contains invalid characters")
	}
	return name, nil
}

type InviteRequest struct {
	UserID optionalID `json:"userId"`
	Name   string     `json:"name"`
	Email  string     `json:"email"`
	Admin  bool       `json:"admin"`
	RoleID optionalID `json:"roleId"`
}

func (r *InviteRequest) Normalize() error {
	if r.UserID.value != nil {
		return errors.New("please use POST/PUT /client/members/{memberId} for update")
	}
	r.Email = strings.ToLower(strings.TrimSpace(r.Email))
	if r.Email == "" || len(r.Email) > maxEmailLength {
		return errors.New("a valid email is required")
	}
	if addr, err := mail.ParseAddress(r.Email); err != nil || addr.Address != r.Email {
		return errors.New("a valid email is required")
	}
	name, err := normalizeName(r.Name)
	if err != nil {
		return err
	}
	if name == "" {
		name = r.Email
	}
	r.Name = name
	return nil
}

func (r *InviteRequest) role() string {
	if r.Admin {
		return "admin"
	}
	return "member"
}

type UpdateRequest struct {
	Name   string     `json:"name"`
	Admin  *bool      `json:"admin"`
	RoleID optionalID `json:"roleId"`
}

func (r *UpdateRequest) Normalize() error {
	name, err := normalizeName(r.Name)
	if err != nil {
		return err
	}
	r.Name = name
	return nil
}

type newMember struct {
	tenantID uint64
	email    string
	name     string
	role     string
	roleID   *int64
	data     string
}

func (m *newMember) args() map[string]any {
	return map[string]any{
		"tenantId": m.tenantID,
		"email":    m.email,
		"name":     m.name,
		"role":     m.role,
		"roleId":   m.roleID,
		"data":     m.data,
	}
}

const restoreColumns = `name                 = @name,
		    role                 = @role::user_role,
		    deleted_at           = NULL,
		    created_at           = timezone('utc'::text, now()),
		    api_key              = generate_api_key(20),
		    jwt_iat              = NULL,
		    jwt_refresh_jti      = NULL,
		    jwt_refresh_iat      = NULL,
		    spot_jwt_iat         = NULL,
		    spot_jwt_refresh_jti = NULL,
		    spot_jwt_refresh_iat = NULL`
