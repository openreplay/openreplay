package auth

import (
	"fmt"
	"openreplay/backend/pkg/server/api"
	"strings"

	"github.com/golang-jwt/jwt/v5"

	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/server/user"
)

type authImpl struct {
	log    logger.Logger
	secret string
	users  user.Users
}

func NewAuth(log logger.Logger, jwtSecret string, users user.Users) (api.RouterMiddleware, error) {
	return &authImpl{
		log:    log,
		secret: jwtSecret,
		users:  users,
	}, nil
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
