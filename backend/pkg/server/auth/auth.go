package auth

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/server/keys"
	"openreplay/backend/pkg/server/user"
)

type Auth interface {
	IsAuthorized(authHeader string, permissions []string, isExtension bool) (*user.User, error)
	Middleware(next http.Handler) http.Handler
	GetServiceAccountJWT(tenantID uint64) (string, error)
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
