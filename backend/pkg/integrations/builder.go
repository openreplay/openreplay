package integrations

import (
	"openreplay/backend/pkg/integrations/service"
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
	IntegrationsAPI api.Handlers
}

func NewServiceBuilder(log logger.Logger, cfg *integrations.Config, pgconn pool.Pool) (*ServiceBuilder, error) {
	objStore, err := store.NewStore(&cfg.ObjectsConfig)
	if err != nil {
		return nil, err
	}
	integrator, err := service.NewService(log, pgconn, objStore)
	if err != nil {
		return nil, err
	}
	handlers, err := integrationsAPI.NewHandlers(log, cfg, integrator)
	if err != nil {
		return nil, err
	}
	builder := &ServiceBuilder{
		Auth:            auth.NewAuth(log, cfg.JWTSecret, "", pgconn, nil),
		RateLimiter:     limiter.NewUserRateLimiter(10, 30, 1*time.Minute, 5*time.Minute),
		IntegrationsAPI: handlers,
	}
	return builder, nil
}
