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

func getServiceAccountUser(conn pool.Pool, tenantID uint64) (*User, error) {
	query := `
		SELECT user_id, name, email, tenant_id
		FROM public.users
		WHERE service_account = true
		AND tenant_id = $1
		AND deleted_at IS NULL
		ORDER BY user_id ASC
		LIMIT 1`

	var account User
	if err := conn.QueryRow(query, tenantID).Scan(&account.ID, &account.Name, &account.Email, &account.TenantID); err != nil {
		return nil, fmt.Errorf("failed to query user: %w", err)
	}
	
	return &account, nil
}
