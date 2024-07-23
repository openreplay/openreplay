package auth

import (
	"fmt"
	"openreplay/backend/pkg/db/postgres/pool"
)

func authUser(conn pool.Pool, userID, tenantID, jwtIAT int) (*User, error) {
	sql := `SELECT user_id, users.tenant_id, users.name, email, EXTRACT(epoch FROM jwt_iat)::BIGINT AS jwt_iat, roles.permissions
		FROM users
		JOIN tenants on users.tenant_id = tenants.tenant_id
		JOIN roles on users.role_id = roles.role_id
		WHERE users.user_id = $1 AND users.tenant_id = $2 AND users.deleted_at IS NULL ;`

	user := &User{}
	var permissions []string
	if err := conn.QueryRow(sql, userID, tenantID).
		Scan(&user.ID, &user.TenantID, &user.Name, &user.Email, &user.JwtIat, &permissions); err != nil {
		return nil, fmt.Errorf("user not found")
	}
	if user.JwtIat == 0 || abs(jwtIAT-user.JwtIat) > 1 {
		return nil, fmt.Errorf("token expired")
	}
	user.Permissions = make(map[string]bool)
	for _, perm := range permissions {
		user.Permissions[perm] = true
	}
	if _, ok := user.Permissions["SPOT"]; !ok {
		return nil, fmt.Errorf("user has no permissions")
	}
	return user, nil
}
