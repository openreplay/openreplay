package user

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func (u *usersImpl) GetServiceAccount(tenantID uint64) (*User, error) {
	if tenantID == 0 {
		return nil, fmt.Errorf("tenant ID is required")
	}

	serviceAccount, err := getServiceAccountUser(u.conn, tenantID)
	if err != nil {
		return nil, err
	}

	return serviceAccount, nil
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
