package auth

import (
	"fmt"
	"strings"

	"github.com/golang-jwt/jwt/v5"

	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
)

// Options struct to hold optional JWT column and secret
type Options struct {
	JwtColumn string // The JWT column to use (e.g., "jwt_iat" or "spot_jwt_iat")
	Secret    string // An optional secret; if nil, default secret is used
}

type Auth interface {
	IsAuthorized(authHeader string, permissions []string, options Options) (*User, error)
	Secret() string
	JWTCol() string
	ExtraSecret() string
}

type authImpl struct {
	log         logger.Logger
	secret      string
	extraSecret string
	pgconn      pool.Pool
	jwtCol      string
}

func (a *authImpl) Secret() string {
	return a.secret
}

func (a *authImpl) JWTCol() string {
	return a.jwtCol
}

func (a *authImpl) ExtraSecret() string {
	return a.extraSecret
}

func NewAuth(log logger.Logger, jwtCol string, jwtSecret string, extraSecret string, conn pool.Pool) Auth {
	return &authImpl{
		log:         log,
		secret:      jwtSecret,
		extraSecret: extraSecret,
		pgconn:      conn,
		jwtCol:      jwtCol,
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
