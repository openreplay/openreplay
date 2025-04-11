package analytics

import (
	"github.com/go-playground/validator/v10"
	"openreplay/backend/pkg/analytics/charts"
	"openreplay/backend/pkg/metrics/database"
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
	ChartsAPI     api.Handlers
}

func NewServiceBuilder(log logger.Logger, cfg *analytics.Config, webMetrics web.Web, dbMetrics database.Database, pgconn pool.Pool) (*ServicesBuilder, error) {
	responser := api.NewResponser(webMetrics)
	audiTrail, err := tracer.NewTracer(log, pgconn, dbMetrics)
	if err != nil {
		return nil, err
	}
	reqValidator := validator.New()
	cardsService, err := cards.New(log, pgconn)
	if err != nil {
		return nil, err
	}
	cardsHandlers, err := cards.NewHandlers(log, cfg, responser, cardsService, reqValidator)
	if err != nil {
		return nil, err
	}
	dashboardsService, err := dashboards.New(log, pgconn)
	if err != nil {
		return nil, err
	}
	dashboardsHandlers, err := dashboards.NewHandlers(log, cfg, responser, dashboardsService, reqValidator)
	if err != nil {
		return nil, err
	}
	chartsService, err := charts.New(log, pgconn)
	if err != nil {
		return nil, err
	}
	chartsHandlers, err := charts.NewHandlers(log, cfg, responser, chartsService, reqValidator)
	if err != nil {
		return nil, err
	}
	return &ServicesBuilder{
		Auth:          auth.NewAuth(log, cfg.JWTSecret, cfg.JWTSpotSecret, pgconn, nil, api.NoPrefix),
		RateLimiter:   limiter.NewUserRateLimiter(10, 30, 1*time.Minute, 5*time.Minute),
		AuditTrail:    audiTrail,
		CardsAPI:      cardsHandlers,
		DashboardsAPI: dashboardsHandlers,
		ChartsAPI:     chartsHandlers,
	}, nil
}
