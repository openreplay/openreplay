package user

import (
	"fmt"

	"github.com/golang-jwt/jwt/v5"

	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/math"
)

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
}

func New(pgconn pool.Pool) Users {
	return &usersImpl{conn: pgconn}
}

func parseJWT(tokenString, secret string) (*JWTClaims, error) {
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

func (u *usersImpl) Get(authHeader, secret string, tokenType TokenType) (*User, error) {
	jwtInfo, err := parseJWT(authHeader, secret)
	if err != nil {
		return nil, err
	}
	dbUser, err := getUserFromDB(u.conn, jwtInfo.UserId, jwtInfo.TenantID, tokenType)
	if err != nil {
		return nil, err
	}
	if !dbUser.ServiceAccount && (dbUser.JwtIat == 0 || math.Abs(int(jwtInfo.IssuedAt.Unix())-dbUser.JwtIat) > 1) {
		return nil, fmt.Errorf("token has been updated")
	}
	return dbUser, nil
}
