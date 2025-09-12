package jwt

import (
	"context"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"

	config "openreplay/backend/internal/config/analytics"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/server/user"
)

type ServiceJWTProvider interface {
	GenerateServiceAccountJWT(ctx context.Context, tenantID int) (string, error)
	GenerateServiceAccountJWTWithOptions(ctx context.Context, tenantID int, forSpot bool, audience string) (string, error)
}

type serviceJWTImpl struct {
	log    logger.Logger
	pgconn pool.Pool
	cfg    *config.Config
}

func NewServiceJWTProvider(log logger.Logger, pgconn pool.Pool, cfg *config.Config) ServiceJWTProvider {
	return &serviceJWTImpl{
		log:    log,
		pgconn: pgconn,
		cfg:    cfg,
	}
}

// ServiceAccount represents a service account user
type ServiceAccount struct {
	UserID   int    `db:"user_id"`
	TenantID int    `db:"tenant_id"`
	Name     string `db:"name"`
	Email    string `db:"email"`
}

// getServiceAccountUser finds a service account user for the given tenant
// Note: This assumes the users table has a tenant_id field
func (s *serviceJWTImpl) getServiceAccountUser(ctx context.Context, tenantID int) (*ServiceAccount, error) {
	query := `
		SELECT user_id, name, email
		FROM public.users
		WHERE service_account = true
		AND tenant_id = $1
		AND deleted_at IS NULL
		ORDER BY user_id ASC
		LIMIT 1`

	var account ServiceAccount
	err := s.pgconn.QueryRow(query, tenantID).Scan(
		&account.UserID,
		&account.Name,
		&account.Email,
	)

	if err != nil {
		s.log.Error(ctx, "Failed to find service account user", "error", err, "tenantID", tenantID)
		return nil, fmt.Errorf("authentication service is temporarily unavailable")
	}

	account.TenantID = tenantID
	return &account, nil
}

// GenerateServiceAccountJWT creates a JWT token for service account operations
func (s *serviceJWTImpl) GenerateServiceAccountJWT(ctx context.Context, tenantID int) (string, error) {
	return s.GenerateServiceAccountJWTWithOptions(ctx, tenantID, false, "front:OpenReplay")
}

// GenerateServiceAccountJWTWithOptions creates a JWT token with specified options
func (s *serviceJWTImpl) GenerateServiceAccountJWTWithOptions(ctx context.Context, tenantID int, forSpot bool, audience string) (string, error) {
	// Use default tenant ID if not provided
	if tenantID == 0 {
		tenantID = 1
	}

	// Find a service account user for the specific tenant
	serviceAccount, err := s.getServiceAccountUser(ctx, tenantID)
	if err != nil {
		return "", err
	}

	// Create JWT claims with exact format as specified
	now := time.Now()
	iat := now.Unix()

	// Determine expiration based on spot or regular JWT
	var exp int64
	var secret string
	if forSpot {
		exp = iat + int64(s.cfg.HTTP.JWTSpotExpiration)
		secret = s.cfg.HTTP.JWTSpotSecret
	} else {
		exp = iat + int64(s.cfg.HTTP.JWTExpiration)
		secret = s.cfg.HTTP.JWTSecret
	}

	// Use default audience if not provided
	if audience == "" {
		audience = "front:OpenReplay"
	}

	claims := &user.JWTClaims{
		UserId:   serviceAccount.UserID,
		TenantID: serviceAccount.TenantID,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(time.Unix(iat, 0)),
			ExpiresAt: jwt.NewNumericDate(time.Unix(exp, 0)),
			Issuer:    s.cfg.HTTP.JWTIssuer,
			Audience:  []string{audience},
		},
	}

	// Generate the token
	token := jwt.NewWithClaims(jwt.SigningMethodHS512, claims)
	tokenString, err := token.SignedString([]byte(secret))
	if err != nil {
		s.log.Error(ctx, "Failed to sign JWT token", "error", err, "userID", serviceAccount.UserID)
		return "", fmt.Errorf("authentication token generation failed")
	}

	s.log.Info(ctx, "Generated service account JWT",
		"userID", serviceAccount.UserID,
		"tenantID", tenantID,
		"email", serviceAccount.Email,
		"iat", iat,
		"exp", exp,
		"issuer", s.cfg.HTTP.JWTIssuer,
		"audience", audience,
		"forSpot", forSpot)

	return tokenString, nil
}
