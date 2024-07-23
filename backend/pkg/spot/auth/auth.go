package auth

import (
	"fmt"
	"strings"

	"github.com/golang-jwt/jwt/v5"

	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
)

type Auth interface {
	IsAuthorized(authHeader string, permissions []string) (*User, error)
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

func parseJWT(authHeader, secret string) (*JWTClaims, error) {
	if authHeader == "" {
		return nil, fmt.Errorf("authorization header missing")
	}
	tokenParts := strings.Split(authHeader, "Bearer ")
	if len(tokenParts) != 2 {
		return nil, fmt.Errorf("invalid token")
	}
	tokenString := tokenParts[1]

	claims := &JWTClaims{}
	token, err := jwt.ParseWithClaims(tokenString, claims,
		func(token *jwt.Token) (interface{}, error) {
			return []byte(secret), nil
		})
	if err != nil || !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}
	return claims, nil
}
