package analytics

import (
	"time"

	"openreplay/backend/internal/config/analytics"
	analyticsAPI "openreplay/backend/pkg/analytics/api"
	"openreplay/backend/pkg/analytics/service"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/metrics/web"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/server/auth"
	"openreplay/backend/pkg/server/limiter"
	"openreplay/backend/pkg/server/tracer"
)

type ServicesBuilder struct {
	Auth         auth.Auth
	RateLimiter  *limiter.UserRateLimiter
	AuditTrail   tracer.Tracer
	AnalyticsAPI api.Handlers
}

func NewServiceBuilder(log logger.Logger, cfg *analytics.Config, webMetrics web.Web, pgconn pool.Pool) (*ServicesBuilder, error) {
	responser := api.NewResponser(webMetrics)

	audiTrail, err := tracer.NewTracer(log, pgconn)
	if err != nil {
		return nil, err
	}

	analyticsService, err := service.NewService(log, pgconn)
	if err != nil {
		return nil, err
	}

	handlers, err := analyticsAPI.NewHandlers(log, cfg, responser, analyticsService)
	if err != nil {
		return nil, err
	}

	return &ServicesBuilder{
		Auth:         auth.NewAuth(log, cfg.JWTSecret, cfg.JWTSpotSecret, pgconn, nil),
		RateLimiter:  limiter.NewUserRateLimiter(10, 30, 1*time.Minute, 5*time.Minute),
		AuditTrail:   audiTrail,
		AnalyticsAPI: handlers,
	}, nil
}
