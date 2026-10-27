package accounts

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"

	"openreplay/backend/pkg/assist"
	"openreplay/backend/pkg/env"
	"openreplay/backend/pkg/license"
	"openreplay/backend/pkg/server/api"
)

const (
	edition         = "ee"
	userScope       = `users.tenant_id = @tenantId`
	tenantScope     = `tenants.tenant_id = @tenantId AND tenants.deleted_at IS NULL`
	tenantKeyColumn = `tenants.tenant_key`
)

type userExtra struct {
	Origin         *string  `json:"origin"`
	RoleID         *int     `json:"roleId"`
	RoleName       *string  `json:"roleName"`
	Permissions    []string `json:"permissions"`
	AllProjects    *bool    `json:"allProjects"`
	ServiceAccount bool     `json:"serviceAccount"`
}

type accountExtra struct {
	SAML2 bool `json:"saml2"`
}

func saml2Available() bool {
	if env.StringOptional("SAML2_MD_URL") != "" {
		return true
	}
	return env.StringOptional("idp_entityId") != "" && env.StringOptional("idp_sso_url") != "" && env.StringOptional("idp_x509cert") != ""
}

func accountExtras() accountExtra {
	return accountExtra{SAML2: saml2Available()}
}

func licenseStatus() (bool, int64) {
	status := license.CurrentStatus()
	return status.Valid, status.ExpirationDate
}

func (s *serviceImpl) getUser(tenantID, userID uint64) (*userInfo, *userExtra, error) {
	u := &userInfo{}
	extra := &userExtra{}
	var role string
	var settings []byte
	err := s.pgconn.QueryRow(`
		SELECT users.user_id, users.email, users.role::text, users.name, users.settings,
		       basic_authentication.password IS NOT NULL,
		       users.origin, users.role_id, roles.name, COALESCE(roles.permissions, '{}'::text[]),
		       roles.all_projects, users.service_account
		FROM public.users
		         LEFT JOIN public.basic_authentication ON users.user_id = basic_authentication.user_id
		         LEFT JOIN public.roles ON roles.role_id = users.role_id
		WHERE users.user_id = @userId
		  AND users.tenant_id = @tenantId
		  AND users.deleted_at IS NULL
		  AND (roles.role_id IS NULL OR roles.deleted_at IS NULL AND roles.tenant_id = @tenantId)
		LIMIT 1`,
		accountArgs(tenantID, userID)).Scan(&u.UserID, &u.Email, &role, &u.Name, &settings, &u.HasPassword,
		&extra.Origin, &extra.RoleID, &extra.RoleName, &extra.Permissions, &extra.AllProjects, &extra.ServiceAccount)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil, ErrUserNotFound
		}
		return nil, nil, fmt.Errorf("get user: %s", err)
	}
	u.setRole(role)
	u.Settings = parseSettings(settings)
	return u, extra, nil
}

type iceServer struct {
	URLs       string `json:"urls"`
	Username   string `json:"username,omitempty"`
	Credential string `json:"credential,omitempty"`
}

func iceServers(raw, secret string, ttlHours int, now time.Time) ([]iceServer, error) {
	if raw == "" {
		return nil, nil
	}
	entries := strings.Split(raw, "|")
	servers := make([]iceServer, 0, len(entries))
	if secret != "" {
		creds, err := assist.NewTurnCredentials(secret, ttlHours, now)
		if err != nil {
			return nil, err
		}
		for _, entry := range entries {
			url := strings.Split(entry, ",")[0]
			if strings.HasPrefix(strings.ToLower(url), "stun") {
				servers = append(servers, iceServer{URLs: url})
				continue
			}
			servers = append(servers, iceServer{URLs: url, Username: creds.Username, Credential: creds.Credential})
		}
		return servers, nil
	}
	for _, entry := range entries {
		parts := strings.Split(entry, ",")
		if len(parts) == 3 {
			servers = append(servers, iceServer{URLs: parts[0], Username: parts[1], Credential: parts[2]})
			continue
		}
		servers = append(servers, iceServer{URLs: parts[0]})
	}
	return servers, nil
}

func (h *handlersImpl) editionHandlers(req api.RequestHandler) []*api.Description {
	return []*api.Description{
		{"/config/assist/credentials", "GET", req.Handle(h.getAssistCredentials), api.NoPermissions, "get_assist_credentials"},
		{"/assist/credentials", "GET", req.Handle(h.getAssistCredentials), api.NoPermissions, "get_assist_credentials"},
	}
}

func withLegacy(value, legacyKey string) string {
	if value != "" {
		return value
	}
	return env.StringOptional(legacyKey)
}

func assistTTL(configured int) int {
	if configured > 0 {
		return configured
	}
	if legacy, err := strconv.Atoi(env.StringOptional("assist_ttl")); err == nil && legacy > 0 {
		return legacy
	}
	return assist.DefaultTurnTTLHours
}

func (h *handlersImpl) getAssistCredentials(r *api.RequestContext) (any, int, error) {
	servers, err := iceServers(withLegacy(h.cfg.IceServers, "iceServers"), withLegacy(h.cfg.AssistSecret, "assist_secret"),
		assistTTL(h.cfg.AssistTTL), time.Now())
	if err != nil {
		return h.fail(r, "build assist credentials", err)
	}
	return servers, 0, nil
}
