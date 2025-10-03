package auth

import (
	"fmt"

	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/math"
	"openreplay/backend/pkg/server/user"
)

func authUser(conn pool.Pool, userID, tenantID, jwtIAT int) (*user.User, error) {
	sql := `
		SELECT user_id, name, email, EXTRACT(epoch FROM spot_jwt_iat)::BIGINT AS spot_jwt_iat
	   	FROM public.users
	   	WHERE user_id = $1 AND deleted_at IS NULL
	   	LIMIT 1;`
	newUser := &user.User{TenantID: 1, AuthMethod: "jwt"}
	if err := conn.QueryRow(sql, userID).Scan(&newUser.ID, &newUser.Name, &newUser.Email, &newUser.JwtIat); err != nil {
		return nil, fmt.Errorf("user not found")
	}
	if newUser.JwtIat == 0 || math.Abs(jwtIAT-newUser.JwtIat) > 1 {
		return nil, fmt.Errorf("token has been updated")
	}
	return newUser, nil
}
