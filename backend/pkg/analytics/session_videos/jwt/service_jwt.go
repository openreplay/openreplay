package jwt

import (
	"context"
	"fmt"

	config "openreplay/backend/internal/config/analytics"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/server/auth"
)

type ServiceJWTProvider interface {
	GenerateServiceAccountJWT(ctx context.Context, tenantID int) (string, error)
}

type serviceJWTImpl struct {
	log    logger.Logger
	pgconn pool.Pool
	cfg    *config.Config
	auth   auth.Auth
}

func NewServiceJWTProvider(log logger.Logger, pgconn pool.Pool, cfg *config.Config, auth auth.Auth) ServiceJWTProvider {
	return &serviceJWTImpl{
		log:    log,
		pgconn: pgconn,
		cfg:    cfg,
		auth:   auth,
	}
}

type ServiceAccount struct {
	UserID   int    `db:"user_id"`
	TenantID int    `db:"tenant_id"`
	Name     string `db:"name"`
	Email    string `db:"email"`
}

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

func (s *serviceJWTImpl) GenerateServiceAccountJWT(ctx context.Context, tenantID int) (string, error) {
	if tenantID == 0 {
		return "", fmt.Errorf("tenant ID is required")
	}

	serviceAccount, err := s.getServiceAccountUser(ctx, tenantID)
	if err != nil {
		return "", err
	}

	tokenString, err := s.auth.GenerateJWT(serviceAccount.UserID, serviceAccount.TenantID, s.cfg.HTTP.JWTExpiration)
	if err != nil {
		s.log.Error(ctx, "Failed to generate JWT token", "error", err, "userID", serviceAccount.UserID)
		return "", fmt.Errorf("authentication token generation failed")
	}

	return tokenString, nil
}
