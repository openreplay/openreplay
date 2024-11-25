package auth

import (
	"fmt"
	"openreplay/backend/pkg/db/postgres/pool"
)

func authUser(conn pool.Pool, userID, tenantID, jwtIAT int, jwtCol string) (*User, error) {
	sql := fmt.Sprintf(`
		SELECT user_id, name, email, EXTRACT(epoch FROM %s)::BIGINT AS jwt_iat
	   	FROM public.users
	   	WHERE user_id = $1 AND deleted_at IS NULL
	   	LIMIT 1;`, jwtCol)
	user := &User{TenantID: 1, AuthMethod: "jwt"}
	if err := conn.QueryRow(sql, userID).Scan(&user.ID, &user.Name, &user.Email, &user.JwtIat); err != nil {
		return nil, fmt.Errorf("user not found") // TODO should be a proper message with error message
	}
	if user.JwtIat == 0 || abs(jwtIAT-user.JwtIat) > 1 {
		return nil, fmt.Errorf("token has been updated")
	}
	return user, nil
}
