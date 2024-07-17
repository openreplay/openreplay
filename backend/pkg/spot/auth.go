package spot

import (
	"fmt"
	"openreplay/backend/pkg/db/postgres/pool"
	"strings"

	"github.com/dgrijalva/jwt-go"

	"openreplay/backend/pkg/logger"
)

type Auth interface {
	IsAuthorized(authHeader string) (*User, error)
}

type authImpl struct {
	log    logger.Logger
	secret string
	pgconn pool.Pool
}

func NewAuth(log logger.Logger, jwtSecret string, conn pool.Pool) Auth {
	return &authImpl{
		log:    log,
		secret: jwtSecret,
		pgconn: conn,
	}
}

type JWTClaims struct {
	UserId   int `json:"userId"`
	TenantID int `json:"tenantId"`
	jwt.StandardClaims
}

type User struct {
	ID       uint64 `json:"id"`
	Name     string `json:"name"`
	Email    string `json:"email"`
	TenantID uint64 `json:"tenantId"`
	JwtIat   int    `json:"jwtIat"`
}

func (a *authImpl) IsAuthorized(authHeader string) (*User, error) {
	if authHeader == "" {
		return nil, fmt.Errorf("authorization header missing")
	}
	tokenParts := strings.Split(authHeader, "Bearer ")
	if len(tokenParts) != 2 {
		return nil, fmt.Errorf("invalid token")
	}
	tokenString := tokenParts[1]

	// Parse and validate the token
	claims := &JWTClaims{}
	token, err := jwt.ParseWithClaims(tokenString, claims,
		func(token *jwt.Token) (interface{}, error) {
			return []byte(a.secret), nil
		})
	if err != nil || !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	// Check if the user exists and the token is not expired
	return a.authExists(claims.UserId, claims.TenantID, int(claims.IssuedAt))
}

func (a *authImpl) authExists(userID, tenantID, jwtIAT int) (*User, error) {
	sql := `
		SELECT user_id, name, email, EXTRACT(epoch FROM jwt_iat)::BIGINT AS jwt_iat
	   	FROM public.users
	   	WHERE user_id = $1 AND deleted_at IS NULL
	   	LIMIT 1;`

	user := &User{TenantID: 1} // fixed for oss
	if err := a.pgconn.QueryRow(sql, userID).Scan(&user.ID, &user.Name, &user.Email, &user.JwtIat); err != nil {
		return nil, fmt.Errorf("user not found")
	}
	if user.JwtIat == 0 || abs(jwtIAT-user.JwtIat) > 1 {
		return nil, fmt.Errorf("token expired")
	}
	return user, nil
}

func abs(x int) int {
	if x < 0 {
		return -x
	}
	return x
}
