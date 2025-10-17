package auth

import (
	"fmt"
	"strings"

	"github.com/golang-jwt/jwt/v5"

	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/projects"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/server/tenant"
	"openreplay/backend/pkg/server/user"
)

type authImpl struct {
	log      logger.Logger
	secret   string
	users    user.Users
	projects projects.Projects
	tenants  tenant.Tenants
}

func NewAuth(log logger.Logger, jwtSecret string, users user.Users, tenants tenant.Tenants, projects projects.Projects) (api.RouterMiddleware, error) {
	return &authImpl{
		log:      log,
		secret:   jwtSecret,
		users:    users,
		projects: projects,
		tenants:  tenants,
	}, nil
}

func getTokenString(authHeader string) (string, error) {
	if authHeader == "" {
		return "", fmt.Errorf("authorization header missing")
	}
	tokenParts := strings.Split(authHeader, "Bearer ")
	if len(tokenParts) != 2 {
		return "", fmt.Errorf("invalid authorization header")
	}
	return tokenParts[1], nil
}

func parseJWT(authHeader, secret string) (*user.JWTClaims, error) {
	tokenString, err := getTokenString(authHeader)
	if err != nil {
		return nil, err
	}

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
