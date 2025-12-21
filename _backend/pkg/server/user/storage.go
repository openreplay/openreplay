package user

import (
	"fmt"

	"openreplay/backend/pkg/db/postgres/pool"
)

func getUserFromDB(conn pool.Pool, userID, tenantID int, tokenType TokenType) (*User, error) {
	sql := fmt.Sprintf(`
		SELECT user_id, name, email, EXTRACT(epoch FROM %s)::BIGINT AS jwt_iat
	   	FROM public.users
	   	WHERE user_id = $1 AND deleted_at IS NULL
	   	LIMIT 1;`, tokenType)
	user := &User{TenantID: 1, AuthMethod: "jwt"}
	if err := conn.QueryRow(sql, userID).Scan(&user.ID, &user.Name, &user.Email, &user.JwtIat); err != nil {
		return nil, fmt.Errorf("user not found")
	}
	return user, nil
}
