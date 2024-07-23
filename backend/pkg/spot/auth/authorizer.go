package auth

func (a *authImpl) IsAuthorized(authHeader string, permissions []string) (*User, error) {
	jwtInfo, err := parseJWT(authHeader, a.secret)
	if err != nil {
		return nil, err
	}
	return authUser(a.pgconn, jwtInfo.UserId, jwtInfo.TenantID, int(jwtInfo.IssuedAt.Unix()))
}
