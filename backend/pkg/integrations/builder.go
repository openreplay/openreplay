package integrations

import (
	"openreplay/backend/internal/config/integrations"
	"openreplay/backend/pkg/db/postgres/pool"
	integrationsAPI "openreplay/backend/pkg/integrations/api"
	"openreplay/backend/pkg/integrations/service"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/metrics/database"
	"openreplay/backend/pkg/metrics/web"
	"openreplay/backend/pkg/objectstorage/store"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/server/auth"
	"openreplay/backend/pkg/server/limiter"
	"openreplay/backend/pkg/server/tracer"
)

type serviceBuilder struct {
	auth            api.RouterMiddleware
	rateLimiter     api.RouterMiddleware
	auditTrail      api.RouterMiddleware
	integrationsAPI api.Handlers
}

func (b *serviceBuilder) Middlewares() []api.RouterMiddleware {
	return []api.RouterMiddleware{b.rateLimiter, b.auth, b.auditTrail}
}

func (b *serviceBuilder) Handlers() []api.Handlers {
	return []api.Handlers{b.integrationsAPI}
}

func NewServiceBuilder(log logger.Logger, cfg *integrations.Config, webMetrics web.Web, dbMetrics database.Database, pgconn pool.Pool) (api.ServiceBuilder, error) {
	objStore, err := store.NewStore(&cfg.ObjectsConfig)
	if err != nil {
		return nil, err
	}
	integrator, err := service.NewService(log, pgconn, objStore)
	if err != nil {
		return nil, err
	}
	responser := api.NewResponser(webMetrics)
	handlers, err := integrationsAPI.NewHandlers(log, cfg, responser, integrator)
	if err != nil {
		return nil, err
	}
	auditrail, err := tracer.NewTracer(log, pgconn, dbMetrics)
	if err != nil {
		return nil, err
	}
	builder := &serviceBuilder{
		auth:            auth.NewAuth(log, cfg.JWTSecret, "", pgconn, nil, api.NoPrefix),
		rateLimiter:     limiter.NewUserRateLimiter(&cfg.RateLimiter),
		auditTrail:      auditrail,
		integrationsAPI: handlers,
	}
	return builder, nil
}
