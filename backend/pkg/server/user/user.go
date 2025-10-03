package user

import (
	"fmt"

	"openreplay/backend/pkg/db/postgres/pool"

	"github.com/golang-jwt/jwt/v5"
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
	Get(userID, tenantID int, tokenType TokenType) (*User, error)
}

type usersImpl struct {
	conn pool.Pool
}

func New(pgconn pool.Pool) Users {
	return &usersImpl{conn: pgconn}
}

func (u *usersImpl) Get(userID, tenantID int, tokenType TokenType) (*User, error) {
	return getUserFromDB(u.conn, userID, tenantID, tokenType)
}
