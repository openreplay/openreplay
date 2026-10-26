package team

import (
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"

	"openreplay/backend/pkg/db/postgres"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/server/api"
)

const (
	rolesEnabled      = false
	memberJoined      = `basic_authentication.password IS NOT NULL`
	memberRoleColumns = `NULL::bigint, NULL::text`
	memberRoleJoin    = ``
	memberScope       = `TRUE`
	userScope         = `TRUE`
	tenantScope       = `TRUE`
	updateRoleSet     = ``
	deleteMemberSet   = ``
	demoteOwnerSet    = ``
	promoteOwnerSet   = ``
)

func (s *teamImpl) resolveRole(tx *pool.Tx, tenantID uint64, roleID *int64) (*int64, error) {
	return nil, nil
}

func (s *teamImpl) ownershipRoles(tx *pool.Tx, tenantID uint64) (*int64, *int64, error) {
	return nil, nil, nil
}

func (s *teamImpl) createOrRestore(tx *pool.Tx, m *newMember) (int64, error) {
	args := pgx.NamedArgs(m.args())
	var userID int64
	err := tx.TxQueryRow(`
		SELECT users.user_id
		FROM public.users
		WHERE users.email = @email
		  AND users.deleted_at IS NOT NULL
		LIMIT 1
		FOR UPDATE`, args).Scan(&userID)
	switch {
	case err == nil:
		args["userId"] = userID
		if err := tx.TxExec(`
			UPDATE public.users
			SET `+restoreColumns+`
			WHERE users.user_id = @userId
			  AND users.deleted_at IS NOT NULL`, args); err != nil {
			return 0, fmt.Errorf("restore member: %s", err)
		}
		return userID, nil
	case !errors.Is(err, pgx.ErrNoRows):
		return 0, fmt.Errorf("find deleted user: %s", err)
	}
	if err := tx.TxQueryRow(`
		INSERT INTO public.users (email, role, name, data)
		VALUES (@email, @role::user_role, @name, @data::jsonb)
		RETURNING user_id`, args).Scan(&userID); err != nil {
		if postgres.IsPkeyViolation(err) {
			return 0, badRequest("user already exists")
		}
		return 0, fmt.Errorf("create member: %s", err)
	}
	return userID, nil
}

func (h *handlersImpl) editionHandlers(req api.RequestHandler) []*api.Description {
	return nil
}
