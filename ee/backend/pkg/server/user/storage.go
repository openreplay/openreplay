package user

import (
	"database/sql"
	"fmt"

	"openreplay/backend/pkg/db/postgres/pool"
)

func getUserFromDB(conn pool.Pool, userID, tenantID int, tokenType TokenType) (*User, error) {
	query := fmt.Sprintf(`
		SELECT user_id, users.tenant_id, users.name, email, EXTRACT(epoch FROM %s)::BIGINT AS jwt_iat, roles.permissions,
		       (users.service_account = true AND NOT EXISTS (SELECT 1 FROM public.basic_authentication WHERE user_id = users.user_id)) AS service_account
	   	FROM public.users as users
	   	JOIN tenants on users.tenant_id = tenants.tenant_id
		JOIN roles on users.role_id = roles.role_id
	   	WHERE users.user_id = $1 AND users.tenant_id = $2 AND users.deleted_at IS NULL`, tokenType)

	user := &User{AuthMethod: "jwt"}
	var permissions []string
	var jwtIat sql.NullInt64
	if err := conn.QueryRow(query, userID, tenantID).
		Scan(&user.ID, &user.TenantID, &user.Name, &user.Email, &jwtIat, &permissions, &user.ServiceAccount); err != nil {
		return nil, fmt.Errorf("user not found", err)
	}

	if jwtIat.Valid {
		user.JwtIat = int(jwtIat.Int64)
	}

	user.Permissions = make(map[string]bool)
	for _, permission := range permissions {
		user.Permissions[permission] = true
	}

	return user, nil
}
