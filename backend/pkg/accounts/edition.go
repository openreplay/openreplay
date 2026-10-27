package accounts

import (
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"

	"openreplay/backend/pkg/server/api"
)

const (
	edition         = "foss"
	userScope       = `TRUE`
	tenantScope     = `TRUE`
	tenantKeyColumn = `NULL::text`
)

type userExtra struct{}

type accountExtra struct{}

func accountExtras() accountExtra {
	return accountExtra{}
}

func licenseStatus() (bool, int64) {
	return true, -1
}

func (s *serviceImpl) getUser(tenantID, userID uint64) (*userInfo, *userExtra, error) {
	u := &userInfo{HasPassword: true}
	var role string
	var settings []byte
	err := s.pgconn.QueryRow(`
		SELECT users.user_id, users.email, users.role::text, users.name, users.settings
		FROM public.users
		WHERE users.user_id = @userId
		  AND users.deleted_at IS NULL
		LIMIT 1`,
		accountArgs(tenantID, userID)).Scan(&u.UserID, &u.Email, &role, &u.Name, &settings)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil, ErrUserNotFound
		}
		return nil, nil, fmt.Errorf("get user: %s", err)
	}
	u.setRole(role)
	u.Settings = parseSettings(settings)
	return u, &userExtra{}, nil
}

func (h *handlersImpl) editionHandlers(req api.RequestHandler) []*api.Description {
	return nil
}
