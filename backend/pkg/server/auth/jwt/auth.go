package jwt

import (
	"fmt"
	"net/http"
	"strings"

	ctxStore "github.com/docker/distribution/context"
	"github.com/golang-jwt/jwt/v5"

	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/server/user"
)

type authImpl struct {
	log       logger.Logger
	jwtSecret string
	pgconn    pool.Pool
}

func NewAuth(log logger.Logger, jwtSecret string, pgConn pool.Pool) api.RouterMiddleware {
	return &authImpl{
		log:       log,
		jwtSecret: jwtSecret,
		pgconn:    pgConn,
	}
}

func (a *authImpl) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		jwtInfo, err := parseJWT(authHeader, a.jwtSecret)
		if err != nil {
			a.log.Warn(r.Context(), "Unauthorized request, wrong jwt token: %s", err)
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		userInfo, err := authUser(a.pgconn, jwtInfo.UserId, jwtInfo.TenantID, int(jwtInfo.IssuedAt.Unix()))
		if err != nil {
			a.log.Warn(r.Context(), "Unauthorized request, user not found: %s", err)
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		r = r.WithContext(ctxStore.WithValues(r.Context(), map[string]interface{}{"userData": userInfo}))
		next.ServeHTTP(w, r)
	})
}

func parseJWT(authHeader, secret string) (*user.JWTClaims, error) {
	if authHeader == "" {
		return nil, fmt.Errorf("authorization header missing")
	}
	tokenParts := strings.Split(authHeader, "Bearer ")
	if len(tokenParts) != 2 {
		return nil, fmt.Errorf("invalid authorization header")
	}
	tokenString := tokenParts[1]

	claims := &user.JWTClaims{}
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

func authUser(conn pool.Pool, userID, tenantID, jwtIAT int) (*user.User, error) {
	sql := `
		SELECT user_id, name, email, EXTRACT(epoch FROM spot_jwt_iat)::BIGINT AS spot_jwt_iat
	   	FROM public.users
	   	WHERE user_id = $1 AND deleted_at IS NULL
	   	LIMIT 1;`
	newUser := &user.User{TenantID: 1, AuthMethod: "jwt"}
	if err := conn.QueryRow(sql, userID).Scan(&newUser.ID, &newUser.Name, &newUser.Email, &newUser.JwtIat); err != nil {
		return nil, fmt.Errorf("user not found")
	}
	if newUser.JwtIat == 0 || abs(jwtIAT-newUser.JwtIat) > 1 {
		return nil, fmt.Errorf("token has been updated")
	}
	return newUser, nil
}

func abs(x int) int {
	if x < 0 {
		return -x
	}
	return x
}
