package auth

import (
	"fmt"
	"strings"

	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/server/user"
)

func authUser(conn pool.Pool, userID, tenantID, jwtIAT int, isExtension bool) (*user.User, error) {
	sql := `SELECT user_id, users.tenant_id, users.name, email, EXTRACT(epoch FROM spot_jwt_iat)::BIGINT AS spot_jwt_iat, roles.permissions
		FROM users
		JOIN tenants on users.tenant_id = tenants.tenant_id
		JOIN roles on users.role_id = roles.role_id
		WHERE users.user_id = $1 AND users.tenant_id = $2 AND users.deleted_at IS NULL ;`
	if !isExtension {
		sql = strings.ReplaceAll(sql, "spot_jwt_iat", "jwt_iat")
	}
	user := &user.User{}
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

func abs(x int) int {
	if x < 0 {
		return -x
	}
	return x
}
