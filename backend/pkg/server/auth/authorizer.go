package auth

import (
	"fmt"

	"openreplay/backend/pkg/math"
	"openreplay/backend/pkg/server/user"
)

func (a *authImpl) isAuthorized(authHeader string) (*user.User, error) {
	jwtInfo, err := parseJWT(authHeader, a.secret)
	if err != nil {
		return nil, err
	}
	dbUser, err := a.users.Get(jwtInfo.UserId, jwtInfo.TenantID, user.AuthToken)
	if err != nil {
		return nil, err
	}
	if dbUser.JwtIat == 0 || math.Abs(int(jwtInfo.IssuedAt.Unix())-dbUser.JwtIat) > 1 {
		return nil, fmt.Errorf("token has been updated")
	}
	return dbUser, nil
}
