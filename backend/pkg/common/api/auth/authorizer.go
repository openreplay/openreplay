package auth

func (a *authImpl) IsAuthorized(authHeader string, permissions []string, options Options) (*User, error) {
	jwtCol := options.JwtColumn
	secret := options.Secret

	jwtInfo, err := parseJWT(authHeader, secret)
	if err != nil {
		return nil, err
	}
	return authUser(a.pgconn, jwtInfo.UserId, jwtInfo.TenantID, int(jwtInfo.IssuedAt.Unix()), jwtCol)
}
