package auth

import (
	"fmt"

	"openreplay/backend/pkg/server/user"
)

func (a *authImpl) IsAuthorized(authHeader string, permissions []string, isExtension bool) (*user.User, error) {
	secret := a.secret
	if isExtension {
		secret = a.spotSecret
	}
	jwtInfo, err := parseJWT(authHeader, secret)
	if err != nil {
		return nil, err
	}

	user, err := authUser(a.pgconn, jwtInfo.UserId, jwtInfo.TenantID, int(jwtInfo.IssuedAt.Unix()), isExtension)
	if err != nil {
		return nil, err
	}
	for _, perm := range permissions {
		if !user.HasPermission(perm) {
			return nil, fmt.Errorf("user has no permission")
		}
	}
	return user, nil
}
