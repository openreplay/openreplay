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

type Auth interface {
	IsAuthorized(authHeader string, permissions []string, isExtension bool) (*user.User, error)
	Middleware(next http.Handler) http.Handler
	GetServiceAccountJWT(tenantID uint64) (string, error)
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

func (a *authImpl) GetServiceAccountJWT(tenantID uint64) (string, error) {
	if tenantID == 0 {
		return "", fmt.Errorf("tenant ID is required")
	}

	serviceAccount, err := a.getServiceAccountUser(tenantID)
	if err != nil {
		return "", err
	}

	tokenString, err := a.generateJWT(serviceAccount.ID, serviceAccount.TenantID, 3600*time.Second)
	if err != nil {
		return "", fmt.Errorf("authentication token generation failed")
	}

	return tokenString, nil
}

func (a *authImpl) generateJWT(userID, tenantID uint64, duration time.Duration) (string, error) {
	now := time.Now()
	claims := &user.JWTClaims{
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
	tokenString, err := token.SignedString([]byte(a.secret))
	if err != nil {
		return "", fmt.Errorf("failed to sign JWT token: %w", err)
	}

	return tokenString, nil
}

func (a *authImpl) getServiceAccountUser(tenantID uint64) (*user.User, error) {
	query := `
		SELECT user_id, name, email
		FROM public.users
		WHERE service_account = true
		AND tenant_id = $1
		AND deleted_at IS NULL
		ORDER BY user_id ASC
		LIMIT 1`

	var account user.User
	if err := a.pgconn.QueryRow(query, tenantID).Scan(&account.ID, &account.Name, &account.Email); err != nil {
		return nil, fmt.Errorf("failed to query user: %w", err)
	}
	account.TenantID = tenantID
	return &account, nil
}
