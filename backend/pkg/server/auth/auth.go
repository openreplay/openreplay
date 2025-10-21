package auth

import (
	"fmt"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/projects"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/server/tenant"
	"openreplay/backend/pkg/server/user"
	"openreplay/backend/pkg/spot/keys"
)

type JWTClaims struct {
	UserId   int `json:"userId"`
	TenantID int `json:"tenantId"`
	jwt.RegisteredClaims
}

type authImpl struct {
	log             logger.Logger
	secret          string
	users           user.Users
	projects        projects.Projects
	tenants         tenant.Tenants
	extensionSecret string
	keys            keys.Keys
}

func NewAuth(log logger.Logger, jwtSecret string, users user.Users, tenants tenant.Tenants, projects projects.Projects, extensionSecret *string, keys keys.Keys) (api.RouterMiddleware, error) {
	return &authImpl{
		log:             log,
		secret:          jwtSecret,
		users:           users,
		projects:        projects,
		tenants:         tenants,
		extensionSecret: defaultString(extensionSecret),
		keys:            keys,
	}, nil
}

func defaultString(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func GenerateJWT(userID, tenantID uint64, duration time.Duration, secret string) (string, error) {
	now := time.Now()
	claims := &JWTClaims{
		UserId:   int(userID),
		TenantID: int(tenantID),
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(duration)),
			Issuer:    "openreplay-go",
			Audience:  []string{"front:OpenReplay"},
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS512, claims)
	tokenString, err := token.SignedString([]byte(secret))
	if err != nil {
		return "", fmt.Errorf("failed to sign JWT token: %w", err)
	}

	return tokenString, nil
}
