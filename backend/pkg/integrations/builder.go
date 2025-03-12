package integrations

import (
	"openreplay/backend/pkg/integrations/service"
	"openreplay/backend/pkg/metrics/database"
	"openreplay/backend/pkg/metrics/web"
	"openreplay/backend/pkg/server/tracer"
	"time"

	"openreplay/backend/internal/config/integrations"
	"openreplay/backend/pkg/db/postgres/pool"
	integrationsAPI "openreplay/backend/pkg/integrations/api"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/objectstorage/store"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/server/auth"
	"openreplay/backend/pkg/server/limiter"
)

type ServiceBuilder struct {
	Auth            auth.Auth
	RateLimiter     *limiter.UserRateLimiter
	AuditTrail      tracer.Tracer
	IntegrationsAPI api.Handlers
}

func NewServiceBuilder(log logger.Logger, cfg *integrations.Config, webMetrics web.Web, dbMetrics database.Database, pgconn pool.Pool) (*ServiceBuilder, error) {
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
	builder := &ServiceBuilder{
		Auth:            auth.NewAuth(log, cfg.JWTSecret, "", pgconn, nil, api.NoPrefix),
		RateLimiter:     limiter.NewUserRateLimiter(10, 30, 1*time.Minute, 5*time.Minute),
		AuditTrail:      auditrail,
		IntegrationsAPI: handlers,
	}
	return builder, nil
}
