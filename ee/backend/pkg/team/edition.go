package team

import (
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"

	"openreplay/backend/pkg/db/postgres"
	"openreplay/backend/pkg/db/postgres/pool"
)

const (
	rolesEnabled      = true
	memberJoined      = `(basic_authentication.password IS NOT NULL OR users.origin IS NOT NULL)`
	memberRoleColumns = `users.role_id::bigint, roles.name`
	memberRoleJoin    = `LEFT JOIN public.roles ON roles.role_id = users.role_id`
	memberScope       = `users.tenant_id = @tenantId AND NOT users.service_account`
	userScope         = `users.tenant_id = @tenantId AND NOT users.service_account`
	tenantScope       = `tenants.tenant_id = @tenantId AND tenants.deleted_at IS NULL`
	updateRoleSet     = `,
			    role_id = COALESCE(@roleId, users.role_id)`
	deleteMemberSet = `,
			    role_id = NULL`
	demoteOwnerSet  = `, role_id = @adminRoleId`
	promoteOwnerSet = `, role_id = @ownerRoleId`
	serviceModules  = `{"modules": ["usability-tests", "feature-flags", "replay-export"]}`
)

func (s *teamImpl) resolveRole(tx *pool.Tx, tenantID uint64, roleID *int64) (*int64, error) {
	args := pgx.NamedArgs{"tenantId": tenantID, "roleId": roleID}
	if roleID == nil {
		var id int64
		err := tx.TxQueryRow(`
			SELECT roles.role_id
			FROM public.roles
			WHERE roles.tenant_id = @tenantId
			  AND roles.deleted_at IS NULL
			  AND NOT roles.service_role
			  AND NOT (roles.protected AND lower(roles.name) = 'owner')
			ORDER BY lower(roles.name) = 'member' DESC, roles.hidden, roles.role_id
			LIMIT 1`, args).Scan(&id)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, badRequest("no role is available for new members")
			}
			return nil, fmt.Errorf("find default role: %s", err)
		}
		return &id, nil
	}
	var name string
	var protected bool
	err := tx.TxQueryRow(`
		SELECT roles.name, roles.protected
		FROM public.roles
		WHERE roles.role_id = @roleId
		  AND roles.tenant_id = @tenantId
		  AND roles.deleted_at IS NULL
		  AND NOT roles.service_role`, args).Scan(&name, &protected)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, notFound("role not found")
		}
		return nil, fmt.Errorf("get role: %s", err)
	}
	if protected && strings.EqualFold(name, "owner") {
		return nil, badRequest("invalid role")
	}
	return roleID, nil
}

func (s *teamImpl) ownershipRoles(tx *pool.Tx, tenantID uint64) (*int64, *int64, error) {
	findRole := func(name string) (*int64, error) {
		var id int64
		err := tx.TxQueryRow(`
			SELECT roles.role_id
			FROM public.roles
			WHERE roles.tenant_id = @tenantId
			  AND roles.deleted_at IS NULL
			  AND NOT roles.hidden
			  AND NOT roles.service_role
			  AND lower(roles.name) = @name
			ORDER BY roles.protected DESC, roles.role_id
			LIMIT 1`, pgx.NamedArgs{"tenantId": tenantID, "name": name}).Scan(&id)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, nil
			}
			return nil, fmt.Errorf("find %s role: %s", name, err)
		}
		return &id, nil
	}
	ownerRoleID, err := findRole("owner")
	if err != nil {
		return nil, nil, err
	}
	if ownerRoleID == nil {
		return nil, nil, notFound("owner role not found, cannot transfer ownership")
	}
	adminRoleID, err := findRole("admin")
	if err != nil {
		return nil, nil, err
	}
	if adminRoleID == nil {
		if adminRoleID, err = s.resolveRole(tx, tenantID, nil); err != nil {
			return nil, nil, err
		}
	}
	return ownerRoleID, adminRoleID, nil
}

func (s *teamImpl) createOrRestore(tx *pool.Tx, m *newMember) (int64, error) {
	args := pgx.NamedArgs(m.args())
	var hasServiceAccount bool
	if err := tx.TxQueryRow(`
		SELECT EXISTS(SELECT 1
		              FROM public.users
		              WHERE users.tenant_id = @tenantId
		                AND users.deleted_at IS NULL
		                AND users.service_account)`, args).Scan(&hasServiceAccount); err != nil {
		return 0, fmt.Errorf("check service account: %s", err)
	}
	settingsColumn, settingsValue, settingsSet := "", "", ""
	if hasServiceAccount {
		args["settings"] = serviceModules
		settingsColumn, settingsValue, settingsSet = ", settings", ", @settings::jsonb", ", settings = @settings::jsonb"
	}

	var userID, userTenantID int64
	err := tx.TxQueryRow(`
		SELECT users.user_id, users.tenant_id
		FROM public.users
		WHERE users.email = @email
		  AND users.deleted_at IS NOT NULL
		LIMIT 1
		FOR UPDATE`, args).Scan(&userID, &userTenantID)
	switch {
	case err == nil && uint64(userTenantID) == m.tenantID:
		args["userId"] = userID
		if err := tx.TxExec(`
			UPDATE public.users
			SET `+restoreColumns+`,
			    role_id = @roleId`+settingsSet+`
			WHERE users.user_id = @userId
			  AND users.tenant_id = @tenantId
			  AND users.deleted_at IS NOT NULL`, args); err != nil {
			return 0, fmt.Errorf("restore member: %s", err)
		}
		return userID, nil
	case err == nil:
		if err := tx.TxExec(`
			DELETE FROM public.users
			WHERE users.user_id = @userId
			  AND users.deleted_at IS NOT NULL`, pgx.NamedArgs{"userId": userID}); err != nil {
			return 0, fmt.Errorf("remove deleted user from another tenant: %s", err)
		}
	case !errors.Is(err, pgx.ErrNoRows):
		return 0, fmt.Errorf("find deleted user: %s", err)
	}

	if err := tx.TxQueryRow(`
		INSERT INTO public.users (tenant_id, email, role, name, data, role_id`+settingsColumn+`)
		VALUES (@tenantId, @email, @role::user_role, @name, @data::jsonb, @roleId`+settingsValue+`)
		RETURNING user_id`, args).Scan(&userID); err != nil {
		if postgres.IsPkeyViolation(err) {
			return 0, badRequest("user already exists")
		}
		return 0, fmt.Errorf("create member: %s", err)
	}
	return userID, nil
}
