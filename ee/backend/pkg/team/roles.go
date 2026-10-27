package team

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"slices"
	"strings"
	"unicode/utf8"

	"github.com/jackc/pgx/v5"

	"openreplay/backend/pkg/db/postgres"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/server/api"
)

const (
	maxRoleNameLength    = 40
	maxDescriptionLength = 1000
	roleColumns          = `roles.role_id, roles.tenant_id, roles.name, roles.description, roles.permissions,
		roles.protected, roles.all_projects,
		(EXTRACT(EPOCH FROM roles.created_at) * 1000)::BIGINT,
		(EXTRACT(EPOCH FROM roles.updated_at) * 1000)::BIGINT,
		roles.hidden, roles.service_role,
		COALESCE((SELECT array_agg(roles_projects.project_id ORDER BY roles_projects.project_id)::bigint[]
		          FROM public.roles_projects
		                   INNER JOIN public.projects ON projects.project_id = roles_projects.project_id
		          WHERE roles_projects.role_id = roles.role_id
		            AND projects.deleted_at IS NULL), '{}')`
	visibleRoles = `roles.tenant_id = @tenantId
		  AND roles.deleted_at IS NULL
		  AND NOT roles.service_role
		  AND NOT roles.hidden`
)

var rolePermissions = []string{
	api.SESSION_REPLAY, api.SESSION_EXPORT, api.DEV_TOOLS, api.METRICS, api.ASSIST_LIVE, api.ASSIST_CALL,
	api.SPOT, api.SPOT_PUBLIC, api.DATA_MANAGEMENT, "BROWSER_TESTS",
}

type Role struct {
	RoleID      int64    `json:"roleId"`
	TenantID    int64    `json:"tenantId"`
	Name        string   `json:"name"`
	Description *string  `json:"description"`
	Permissions []string `json:"permissions"`
	Protected   bool     `json:"protected"`
	AllProjects bool     `json:"allProjects"`
	CreatedAt   int64    `json:"createdAt"`
	UpdatedAt   int64    `json:"updatedAt"`
	DeletedAt   *int64   `json:"deletedAt"`
	Hidden      bool     `json:"hidden"`
	ServiceRole bool     `json:"serviceRole"`
	Projects    []int64  `json:"projects"`
}

type RoleRequest struct {
	Name        string   `json:"name"`
	Description *string  `json:"description"`
	Permissions []string `json:"permissions"`
	AllProjects *bool    `json:"allProjects"`
	Projects    []int64  `json:"projects"`
}

func (r *RoleRequest) Normalize() error {
	r.Name = strings.Join(strings.Fields(r.Name), " ")
	if r.Name == "" || utf8.RuneCountInString(r.Name) > maxRoleNameLength {
		return fmt.Errorf("name must be between 1 and %d characters", maxRoleNameLength)
	}
	if r.Description != nil && utf8.RuneCountInString(*r.Description) > maxDescriptionLength {
		return fmt.Errorf("description must be at most %d characters", maxDescriptionLength)
	}
	if r.Permissions == nil {
		return errors.New("permissions is required")
	}
	permissions := make([]string, 0, len(r.Permissions))
	for _, p := range r.Permissions {
		if !slices.Contains(rolePermissions, p) {
			return fmt.Errorf("unknown permission %q", p)
		}
		if !slices.Contains(permissions, p) {
			permissions = append(permissions, p)
		}
	}
	r.Permissions = permissions
	if r.AllProjects == nil {
		allProjects := true
		r.AllProjects = &allProjects
	}
	if !*r.AllProjects && len(r.Projects) == 0 {
		return errors.New("must specify a project or all projects")
	}
	return nil
}

func scanRole(row pgx.Row) (*Role, error) {
	r := &Role{}
	if err := row.Scan(&r.RoleID, &r.TenantID, &r.Name, &r.Description, &r.Permissions, &r.Protected, &r.AllProjects,
		&r.CreatedAt, &r.UpdatedAt, &r.Hidden, &r.ServiceRole, &r.Projects); err != nil {
		return nil, err
	}
	return r, nil
}

func (s *teamImpl) listRoles(tenantID uint64) ([]*Role, error) {
	rows, err := s.pgconn.Query(`
		SELECT `+roleColumns+`
		FROM public.roles
		WHERE `+visibleRoles+`
		ORDER BY roles.role_id`, pgx.NamedArgs{"tenantId": tenantID})
	if err != nil {
		return nil, fmt.Errorf("list roles: %s", err)
	}
	defer rows.Close()
	roles := make([]*Role, 0)
	for rows.Next() {
		r, err := scanRole(rows)
		if err != nil {
			return nil, fmt.Errorf("scan role: %s", err)
		}
		roles = append(roles, r)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate roles: %s", err)
	}
	return roles, nil
}

func (s *teamImpl) getRole(tenantID uint64, roleID int64) (*Role, error) {
	r, err := scanRole(s.pgconn.QueryRow(`
		SELECT `+roleColumns+`
		FROM public.roles
		WHERE `+visibleRoles+`
		  AND roles.role_id = @roleId`, pgx.NamedArgs{"tenantId": tenantID, "roleId": roleID}))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, notFound("role not found")
		}
		return nil, fmt.Errorf("get role: %s", err)
	}
	return r, nil
}

func lockEditableRole(tx *pool.Tx, tenantID uint64, roleID int64) error {
	var protected bool
	err := tx.TxQueryRow(`
		SELECT roles.protected
		FROM public.roles
		WHERE `+visibleRoles+`
		  AND roles.role_id = @roleId
		FOR UPDATE`, pgx.NamedArgs{"tenantId": tenantID, "roleId": roleID}).Scan(&protected)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return notFound("role not found")
		}
		return fmt.Errorf("lock role: %s", err)
	}
	if protected {
		return badRequest("this role is protected")
	}
	return nil
}

func checkRoleName(tx *pool.Tx, tenantID uint64, name string, excludeID int64) error {
	var exists bool
	if err := tx.TxQueryRow(`
		SELECT EXISTS(SELECT 1
		              FROM public.roles
		              WHERE roles.tenant_id = @tenantId
		                AND roles.deleted_at IS NULL
		                AND NOT roles.hidden
		                AND roles.name ILIKE @name ESCAPE '\'
		                AND roles.role_id != @roleId)`,
		pgx.NamedArgs{"tenantId": tenantID, "name": postgres.EscapeILIKE(name), "roleId": excludeID}).Scan(&exists); err != nil {
		return fmt.Errorf("check role name: %s", err)
	}
	if exists {
		return badRequest("name already exists.")
	}
	return nil
}

func setRoleProjects(tx *pool.Tx, tenantID uint64, roleID int64, req *RoleRequest) error {
	if err := tx.TxExec(`DELETE FROM public.roles_projects WHERE roles_projects.role_id = @roleId`,
		pgx.NamedArgs{"roleId": roleID}); err != nil {
		return fmt.Errorf("clear role projects: %s", err)
	}
	if *req.AllProjects {
		return nil
	}
	var inserted int64
	if err := tx.TxQueryRow(`
		WITH added AS (
		    INSERT INTO public.roles_projects (role_id, project_id)
		    SELECT @roleId, projects.project_id
		    FROM public.projects
		    WHERE projects.tenant_id = @tenantId
		      AND projects.project_id = ANY (@projectIds::bigint[])
		      AND projects.deleted_at IS NULL
		    RETURNING project_id)
		SELECT COUNT(*) FROM added`,
		pgx.NamedArgs{"roleId": roleID, "tenantId": tenantID, "projectIds": req.Projects}).Scan(&inserted); err != nil {
		return fmt.Errorf("set role projects: %s", err)
	}
	if inserted == 0 {
		return badRequest("must specify a project or all projects")
	}
	return nil
}

func (s *teamImpl) createRole(ctx context.Context, tenantID uint64, req *RoleRequest) (*Role, error) {
	var roleID int64
	err := s.inTx(ctx, func(tx *pool.Tx) error {
		if err := checkRoleName(tx, tenantID, req.Name, 0); err != nil {
			return err
		}
		if err := tx.TxQueryRow(`
			INSERT INTO public.roles (tenant_id, name, description, permissions, all_projects)
			VALUES (@tenantId, @name, @description, @permissions::text[], @allProjects)
			RETURNING role_id`,
			pgx.NamedArgs{"tenantId": tenantID, "name": req.Name, "description": req.Description,
				"permissions": req.Permissions, "allProjects": *req.AllProjects}).Scan(&roleID); err != nil {
			return fmt.Errorf("create role: %s", err)
		}
		return setRoleProjects(tx, tenantID, roleID, req)
	})
	if err != nil {
		return nil, err
	}
	return s.getRole(tenantID, roleID)
}

func (s *teamImpl) updateRole(ctx context.Context, tenantID uint64, roleID int64, req *RoleRequest) (*Role, error) {
	err := s.inTx(ctx, func(tx *pool.Tx) error {
		if err := lockEditableRole(tx, tenantID, roleID); err != nil {
			return err
		}
		if err := checkRoleName(tx, tenantID, req.Name, roleID); err != nil {
			return err
		}
		if err := tx.TxExec(`
			UPDATE public.roles
			SET name         = @name,
			    description  = COALESCE(@description, roles.description),
			    permissions  = @permissions::text[],
			    all_projects = @allProjects,
			    updated_at   = timezone('utc'::text, now())
			WHERE roles.role_id = @roleId
			  AND roles.tenant_id = @tenantId`,
			pgx.NamedArgs{"tenantId": tenantID, "roleId": roleID, "name": req.Name, "description": req.Description,
				"permissions": req.Permissions, "allProjects": *req.AllProjects}); err != nil {
			return fmt.Errorf("update role: %s", err)
		}
		return setRoleProjects(tx, tenantID, roleID, req)
	})
	if err != nil {
		return nil, err
	}
	return s.getRole(tenantID, roleID)
}

func (s *teamImpl) deleteRole(ctx context.Context, tenantID uint64, roleID int64) ([]*Role, error) {
	err := s.inTx(ctx, func(tx *pool.Tx) error {
		if err := lockEditableRole(tx, tenantID, roleID); err != nil {
			return err
		}
		var attached bool
		if err := tx.TxQueryRow(`
			SELECT EXISTS(SELECT 1
			              FROM public.users
			              WHERE users.tenant_id = @tenantId
			                AND (users.role_id = @roleId OR users.admin_privilege_role_id = @roleId))`,
			pgx.NamedArgs{"tenantId": tenantID, "roleId": roleID}).Scan(&attached); err != nil {
			return fmt.Errorf("check role users: %s", err)
		}
		if attached {
			return badRequest("this role is already attached to other user(s)")
		}
		return tx.TxExec(`
			UPDATE public.roles
			SET deleted_at = timezone('utc'::text, now())
			WHERE roles.role_id = @roleId
			  AND roles.tenant_id = @tenantId
			  AND NOT roles.protected`, pgx.NamedArgs{"tenantId": tenantID, "roleId": roleID})
	})
	if err != nil {
		return nil, err
	}
	return s.listRoles(tenantID)
}

type roleManager interface {
	listRoles(tenantID uint64) ([]*Role, error)
	createRole(ctx context.Context, tenantID uint64, req *RoleRequest) (*Role, error)
	updateRole(ctx context.Context, tenantID uint64, roleID int64, req *RoleRequest) (*Role, error)
	deleteRole(ctx context.Context, tenantID uint64, roleID int64) ([]*Role, error)
}

func (h *handlersImpl) editionHandlers(req api.RequestHandler) []*api.Description {
	return []*api.Description{
		{"/client/roles", "GET", req.Handle(h.listRoles), api.NoPermissions, api.DoNotTrack},
		{"/client/roles", "POST", req.HandleWithBody(h.createRole), api.NoPermissions, "add_role"},
		{"/client/roles", "PUT", req.HandleWithBody(h.createRole), api.NoPermissions, "add_role"},
		{"/client/roles/{roleId}", "POST", req.HandleWithBody(h.updateRole), api.NoPermissions, "edit_role"},
		{"/client/roles/{roleId}", "PUT", req.HandleWithBody(h.updateRole), api.NoPermissions, "edit_role"},
		{"/client/roles/{roleId}", "DELETE", req.Handle(h.deleteRole), api.NoPermissions, "delete_role"},
	}
}

func (h *handlersImpl) roles() (roleManager, error) {
	m, ok := h.team.(roleManager)
	if !ok {
		return nil, errors.New("roles are not available")
	}
	return m, nil
}

func (h *handlersImpl) listRoles(r *api.RequestContext) (any, int, error) {
	u, err := adminUser(r)
	if err != nil {
		return nil, http.StatusUnauthorized, err
	}
	m, err := h.roles()
	if err != nil {
		return h.fail(r, "list roles", err)
	}
	roles, err := m.listRoles(u.TenantID)
	if err != nil {
		return h.fail(r, "list roles", err)
	}
	return roles, 0, nil
}

func decodeRole(r *api.RequestContext) (*RoleRequest, error) {
	req := &RoleRequest{}
	if err := json.Unmarshal(r.Body, req); err != nil {
		return nil, errInvalidBody
	}
	if err := req.Normalize(); err != nil {
		return nil, err
	}
	return req, nil
}

func (h *handlersImpl) createRole(r *api.RequestContext) (any, int, error) {
	u, err := adminUser(r)
	if err != nil {
		return nil, http.StatusUnauthorized, err
	}
	req, err := decodeRole(r)
	if err != nil {
		return nil, http.StatusBadRequest, err
	}
	m, err := h.roles()
	if err != nil {
		return h.fail(r, "create role", err)
	}
	role, err := m.createRole(r.Request.Context(), u.TenantID, req)
	if err != nil {
		return h.fail(r, "create role", err)
	}
	return role, 0, nil
}

func (h *handlersImpl) updateRole(r *api.RequestContext) (any, int, error) {
	u, err := adminUser(r)
	if err != nil {
		return nil, http.StatusUnauthorized, err
	}
	roleID, err := pathID(r, "roleId")
	if err != nil {
		return nil, http.StatusBadRequest, err
	}
	req, err := decodeRole(r)
	if err != nil {
		return nil, http.StatusBadRequest, err
	}
	m, err := h.roles()
	if err != nil {
		return h.fail(r, "update role", err)
	}
	role, err := m.updateRole(r.Request.Context(), u.TenantID, roleID, req)
	if err != nil {
		return h.fail(r, "update role", err)
	}
	return role, 0, nil
}

func (h *handlersImpl) deleteRole(r *api.RequestContext) (any, int, error) {
	u, err := adminUser(r)
	if err != nil {
		return nil, http.StatusUnauthorized, err
	}
	roleID, err := pathID(r, "roleId")
	if err != nil {
		return nil, http.StatusBadRequest, err
	}
	m, err := h.roles()
	if err != nil {
		return h.fail(r, "delete role", err)
	}
	roles, err := m.deleteRole(r.Request.Context(), u.TenantID, roleID)
	if err != nil {
		return h.fail(r, "delete role", err)
	}
	return roles, 0, nil
}
