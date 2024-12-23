package analytics

import (
	"time"

	"openreplay/backend/internal/config/analytics"
	"openreplay/backend/pkg/analytics/cards"
	"openreplay/backend/pkg/analytics/dashboards"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/metrics/web"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/server/auth"
	"openreplay/backend/pkg/server/limiter"
	"openreplay/backend/pkg/server/tracer"
)

type ServicesBuilder struct {
	Auth          auth.Auth
	RateLimiter   *limiter.UserRateLimiter
	AuditTrail    tracer.Tracer
	CardsAPI      api.Handlers
	DashboardsAPI api.Handlers
}

func NewServiceBuilder(log logger.Logger, cfg *analytics.Config, webMetrics web.Web, pgconn pool.Pool) (*ServicesBuilder, error) {
	responser := api.NewResponser(webMetrics)
	audiTrail, err := tracer.NewTracer(log, pgconn)
	if err != nil {
		return nil, err
	}
	cardsService, err := cards.New(log, pgconn)
	if err != nil {
		return nil, err
	}
	cardsHandlers, err := cards.NewHandlers(log, cfg, responser, cardsService)
	if err != nil {
		return nil, err
	}
	dashboardsService, err := dashboards.New(log, pgconn)
	if err != nil {
		return nil, err
	}
	dashboardsHandlers, err := dashboards.NewHandlers(log, cfg, responser, dashboardsService)
	if err != nil {
		return nil, err
	}
	return &ServicesBuilder{
		Auth:          auth.NewAuth(log, cfg.JWTSecret, cfg.JWTSpotSecret, pgconn, nil),
		RateLimiter:   limiter.NewUserRateLimiter(10, 30, 1*time.Minute, 5*time.Minute),
		AuditTrail:    audiTrail,
		CardsAPI:      cardsHandlers,
		DashboardsAPI: dashboardsHandlers,
	}, nil
}
