package auth

import (
	"fmt"
	"strings"

	"github.com/golang-jwt/jwt/v5"

	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
)

type Auth interface {
	IsAuthorized(authHeader string, permissions []string, isExtension bool) (*User, error)
}

type authImpl struct {
	log        logger.Logger
	secret     string
	spotSecret string
	pgconn     pool.Pool
}

func NewAuth(log logger.Logger, jwtSecret, jwtSpotSecret string, conn pool.Pool) Auth {
	return &authImpl{
		log:        log,
		secret:     jwtSecret,
		spotSecret: jwtSpotSecret,
		pgconn:     conn,
	}
}

func parseJWT(authHeader, secret string) (*JWTClaims, error) {
	if authHeader == "" {
		return nil, fmt.Errorf("authorization header missing")
	}
	tokenParts := strings.Split(authHeader, "Bearer ")
	if len(tokenParts) != 2 {
		return nil, fmt.Errorf("invalid authorization header")
	}
	tokenString := tokenParts[1]

	claims := &JWTClaims{}
	// DEBUG
	fmt.Printf("tokenString: %s\n", tokenString)
	fmt.Printf("secret: %s\n", secret)
	// END DEBUG
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
