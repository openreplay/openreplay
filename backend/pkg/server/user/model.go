package user

import "github.com/golang-jwt/jwt/v5"

type JWTClaims struct {
	UserId   int `json:"userId"`
	TenantID int `json:"tenantId"`
	jwt.RegisteredClaims
}

type User struct {
	ID          uint64          `json:"id"`
	Name        string          `json:"name"`
	Email       string          `json:"email"`
	TenantID    uint64          `json:"tenantId"`
	JwtIat      int             `json:"jwtIat"`
	Permissions map[string]bool `json:"permissions"`
	AuthMethod  string
}

func (u *User) HasPermission(perm string) bool {
	if u.Permissions == nil {
		return true // no permissions
	}
	_, ok := u.Permissions[perm]
	return ok
}
