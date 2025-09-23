package user

import (
	"fmt"

	"openreplay/backend/pkg/db/postgres/pool"
)

func getUserFromDB(conn pool.Pool, userID, tenantID int, tokenType TokenType) (*User, error) {
	sql := fmt.Sprintf(`
		SELECT user_id, users.tenant_id, users.name, email, EXTRACT(epoch FROM %s)::BIGINT AS jwt_iat, roles.permissions, users.service_account
	   	FROM public.users as users
	   	JOIN tenants on users.tenant_id = tenants.tenant_id
		JOIN roles on users.role_id = roles.role_id
	   	WHERE users.user_id = $1 AND users.tenant_id = $2 AND users.deleted_at IS NULL
		AND (users.service_account = true AND NOT EXISTS (SELECT 1 FROM public.basic_authentication WHERE user_id = users.user_id));`, tokenType)
	user := &User{AuthMethod: "jwt"}
	var permissions []string
	if err := conn.QueryRow(sql, userID, tenantID).
		Scan(&user.ID, &user.TenantID, &user.Name, &user.Email, &user.JwtIat, &permissions, &user.ServiceAccount); err != nil {
		return nil, fmt.Errorf("user not found")
	}
	user.Permissions = make(map[string]bool)
	for _, permission := range permissions {
		user.Permissions[permission] = true
	}
	return user, nil
}
