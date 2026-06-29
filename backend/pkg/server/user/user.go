package user

import (
	"fmt"

	"github.com/golang-jwt/jwt/v5"

	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/math"
)

const MCPAudience = "mcp:OpenReplay"

type MCPConfig struct {
	Secret    string
	Algorithm string
}

type JWTClaims struct {
	UserId   int `json:"userId"`
	TenantID int `json:"tenantId"`
	jwt.RegisteredClaims
}

type User struct {
	ID             uint64          `json:"id"`
	Name           string          `json:"name"`
	Email          string          `json:"email"`
	TenantID       uint64          `json:"tenantId"`
	JwtIat         int             `json:"jwtIat"`
	Permissions    map[string]bool `json:"permissions"`
	ServiceAccount bool            `json:"serviceAccount"`
	IsEnterprise   bool            `json:"isEnterprise"`
	AuthMethod     string
}

func (u *User) HasPermission(perm string) bool {
	if u.Permissions == nil {
		return true // no permissions
	}
	_, ok := u.Permissions[perm]
	return ok
}

func (u *User) GetIDAsString() string {
	return fmt.Sprintf("%d", u.ID)
}

type TokenType string

const (
	AuthToken TokenType = "jwt_iat"
	SpotToken TokenType = "spot_jwt_iat"
)

type Users interface {
	Get(authHeader, authSecret string, tokenType TokenType) (*User, error)
	GetServiceAccount(tenantID uint64) (*User, error)
}

type usersImpl struct {
	conn pool.Pool
	mcp  MCPConfig
}

func New(pgconn pool.Pool, mcp MCPConfig) Users {
	return &usersImpl{conn: pgconn, mcp: mcp}
}

func peekAudience(tokenString string) string {
	parser := jwt.NewParser()
	var claims jwt.MapClaims
	if _, _, err := parser.ParseUnverified(tokenString, &claims); err != nil {
		return ""
	}
	switch v := claims["aud"].(type) {
	case string:
		return v
	case []interface{}:
		if len(v) > 0 {
			if s, ok := v[0].(string); ok {
				return s
			}
		}
	}
	return ""
}

func parseJWT(tokenString, secret string, allowedMethods []string, audience string) (*JWTClaims, error) {
	claims := &JWTClaims{}
	opts := []jwt.ParserOption{jwt.WithValidMethods(allowedMethods)}
	if audience != "" {
		opts = append(opts, jwt.WithAudience(audience))
	}
	token, err := jwt.ParseWithClaims(tokenString, claims,
		func(token *jwt.Token) (interface{}, error) {
			return []byte(secret), nil
		}, opts...)
	if err != nil {
		return nil, fmt.Errorf("invalid token: %w", err)
	}
	if !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}
	return claims, nil
}

func (u *usersImpl) Get(authHeader, secret string, tokenType TokenType) (*User, error) {
	isMCP := peekAudience(authHeader) == MCPAudience

	useSecret := secret
	allowedAlg := []string{"HS256", "HS384", "HS512"}
	audience := ""
	if isMCP {
		if u.mcp.Secret == "" {
			return nil, fmt.Errorf("MCP authentication is not configured")
		}
		useSecret = u.mcp.Secret
		if u.mcp.Algorithm != "" {
			allowedAlg = []string{u.mcp.Algorithm}
		}
		audience = MCPAudience
	}

	jwtInfo, err := parseJWT(authHeader, useSecret, allowedAlg, audience)
	if err != nil {
		return nil, err
	}
	dbUser, err := getUserFromDB(u.conn, jwtInfo.UserId, jwtInfo.TenantID, tokenType)
	if err != nil {
		return nil, err
	}
	// MCP tokens carry their own lifetime via exp/aud — skip the
	// users.jwt_iat-vs-token.iat tracking used for UI sessions.
	if !isMCP && !dbUser.ServiceAccount &&
		(dbUser.JwtIat == 0 || math.Abs(int(jwtInfo.IssuedAt.Unix())-dbUser.JwtIat) > 1) {
		return nil, fmt.Errorf("token has been updated")
	}
	return dbUser, nil
}
