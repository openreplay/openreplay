package auth

import "fmt"

func (a *authImpl) IsAuthorized(authHeader string, permissions []string) (*User, error) {
	jwtInfo, err := parseJWT(authHeader, a.secret)
	if err != nil {
		return nil, err
	}

	user, err := authUser(a.pgconn, jwtInfo.UserId, jwtInfo.TenantID, int(jwtInfo.IssuedAt.Unix()))
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
