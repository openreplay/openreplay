package auth

import (
	"fmt"
	"openreplay/backend/pkg/db/postgres/pool"
	"strings"
)

func authUser(conn pool.Pool, userID, tenantID, jwtIAT int, isExtension bool) (*User, error) {
	sql := `
		SELECT user_id, name, email, EXTRACT(epoch FROM spot_jwt_iat)::BIGINT AS spot_jwt_iat
	   	FROM public.users
	   	WHERE user_id = $1 AND deleted_at IS NULL
	   	LIMIT 1;`
	if !isExtension {
		sql = strings.ReplaceAll(sql, "spot_jwt_iat", "jwt_iat")
	}
	user := &User{TenantID: 1, AuthMethod: "jwt"}
	if err := conn.QueryRow(sql, userID).Scan(&user.ID, &user.Name, &user.Email, &user.JwtIat); err != nil {
		return nil, fmt.Errorf("user not found")
	}
	if user.JwtIat == 0 || abs(jwtIAT-user.JwtIat) > 1 {
		return nil, fmt.Errorf("token has been updated")
	}
	return user, nil
}
