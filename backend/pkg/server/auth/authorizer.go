package auth

import "openreplay/backend/pkg/server/user"

func (a *authImpl) IsAuthorized(authHeader string, permissions []string, isExtension bool) (*user.User, error) {
	secret := a.secret
	if isExtension {
		secret = a.spotSecret
	}
	jwtInfo, err := parseJWT(authHeader, secret)
	if err != nil {
		return nil, err
	}
	return authUser(a.pgconn, jwtInfo.UserId, jwtInfo.TenantID, int(jwtInfo.IssuedAt.Unix()), isExtension)
}
