package auth

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"

	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/server/keys"
	"openreplay/backend/pkg/server/user"
)

type Auth interface {
	IsAuthorized(authHeader string, permissions []string, isExtension bool) (*user.User, error)
	Middleware(next http.Handler) http.Handler
}

type authImpl struct {
	log        logger.Logger
	secret     string
	spotSecret string
	pgconn     pool.Pool
	keys       keys.Keys
	prefix     string
}

func NewAuth(log logger.Logger, jwtSecret, jwtSpotSecret string, conn pool.Pool, keys keys.Keys, prefix string) Auth {
	return &authImpl{
		log:        log,
		secret:     jwtSecret,
		spotSecret: jwtSpotSecret,
		pgconn:     conn,
		keys:       keys,
		prefix:     prefix,
	}
}

func parseJWT(authHeader, secret string) (*user.JWTClaims, error) {
	if authHeader == "" {
		return nil, fmt.Errorf("authorization header missing")
	}
	tokenParts := strings.Split(authHeader, "Bearer ")
	if len(tokenParts) != 2 {
		return nil, fmt.Errorf("invalid authorization header")
	}
	tokenString := tokenParts[1]

	claims := &user.JWTClaims{}
	token, err := jwt.ParseWithClaims(tokenString, claims,
		func(token *jwt.Token) (interface{}, error) {
			return []byte(secret), nil
		})
	if err != nil || !token.Valid {
		fmt.Printf("token err: %v\n", err)
		return nil, fmt.Errorf("invalid token")
	}
	return claims, nil
}
