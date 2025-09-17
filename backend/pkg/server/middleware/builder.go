package middleware

import (
	"fmt"
	"net/http"

	ctxStore "github.com/docker/distribution/context"

	"openreplay/backend/internal/config/common"
	"openreplay/backend/internal/http/util"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/metrics/database"
	"openreplay/backend/pkg/projects"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/server/auth"
	"openreplay/backend/pkg/server/limiter"
	"openreplay/backend/pkg/server/permissions"
	"openreplay/backend/pkg/server/tenant"
	"openreplay/backend/pkg/server/tracer"
	"openreplay/backend/pkg/server/user"
)

type baseMiddlewareBuilderImpl struct {
	middlewares []api.RouterMiddleware
}

func (b *baseMiddlewareBuilderImpl) Middlewares() []api.RouterMiddleware {
	return b.middlewares
}

func NewMiddlewareBuilder(log logger.Logger, jwtSecret string, http *common.HTTP, rtc *common.RateLimiter, pgPool pool.Pool, dbMetric database.Database, handlers []api.Handlers, tenants *tenant.Tenants, projects *projects.Projects) (api.MiddlewareBuilder, error) {
	healthCheck := NewHealthCheck()
	corsCheck := NewCors(http.UseAccessControlHeaders)
	authenticator, err := auth.NewAuth(log, jwtSecret, user.New(pgPool), tenants, projects)
	if err != nil {
		return nil, fmt.Errorf("error creating auth middleware: %s", err)
	}
	perms, err := permissions.NewPermissions(log, handlers)
	if err != nil {
		return nil, fmt.Errorf("error creating permissions middleware: %s", err)
	}
	rateLimiter, err := limiter.NewUserRateLimiter(rtc)
	if err != nil {
		return nil, fmt.Errorf("error creating rate limiter: %s", err)
	}
	audiTrail, err := tracer.NewTracer(log, pgPool, dbMetric, handlers)
	if err != nil {
		return nil, fmt.Errorf("error creating auditrail middleware: %s", err)
	}
	return &baseMiddlewareBuilderImpl{
		middlewares: []api.RouterMiddleware{healthCheck, corsCheck, authenticator, perms, rateLimiter, audiTrail},
	}, nil
}

type healthCheckImpl struct{}

func NewHealthCheck() api.RouterMiddleware {
	return &healthCheckImpl{}
}

func (b *healthCheckImpl) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/" || r.URL.Path == "/health" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

type corsImpl struct {
	useAccessControlHeaders bool
}

func NewCors(useAccessControlHeaders bool) api.RouterMiddleware {
	return &corsImpl{useAccessControlHeaders}
}

func (b *corsImpl) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if b.useAccessControlHeaders {
			// Prepare headers for preflight requests
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "POST, GET, PUT, PATCH, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type,Authorization,Content-Encoding")
		}
		if r.Method == http.MethodOptions {
			w.Header().Set("Cache-Control", "max-age=86400")
			w.WriteHeader(http.StatusOK)
			return
		}

		r = r.WithContext(ctxStore.WithValues(r.Context(), map[string]interface{}{"httpMethod": r.Method, "url": util.SafeString(r.URL.Path)}))
		next.ServeHTTP(w, r)
	})
}
