package auth

import (
	"fmt"
	"openreplay/backend/pkg/db/postgres/pool"
)

func authUser(conn pool.Pool, userID, tenantID, jwtIAT int) (*User, error) {
	sql := `
		SELECT user_id, name, email, EXTRACT(epoch FROM jwt_iat)::BIGINT AS jwt_iat
	   	FROM public.users
	   	WHERE user_id = $1 AND deleted_at IS NULL
	   	LIMIT 1;`

	user := &User{TenantID: 1}
	if err := conn.QueryRow(sql, userID).Scan(&user.ID, &user.Name, &user.Email, &user.JwtIat); err != nil {
		return nil, fmt.Errorf("user not found")
	}
	if user.JwtIat == 0 || abs(jwtIAT-user.JwtIat) > 1 {
		return nil, fmt.Errorf("token expired")
	}
	return user, nil
}
