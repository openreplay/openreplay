package analytics

import (
	"openreplay/backend/pkg/analytics/model"
	"openreplay/backend/pkg/analytics/session_videos"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/go-playground/validator/v10"

	"openreplay/backend/internal/config/analytics"
	"openreplay/backend/pkg/analytics/cards"
	"openreplay/backend/pkg/analytics/charts"
	"openreplay/backend/pkg/analytics/dashboards"
	"openreplay/backend/pkg/analytics/search"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/metrics/database"
	"openreplay/backend/pkg/metrics/web"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/server/auth"
	"openreplay/backend/pkg/server/limiter"
	"openreplay/backend/pkg/server/tracer"
)

type serviceBuilder struct {
	auth          api.RouterMiddleware
	rateLimiter   api.RouterMiddleware
	auditTrail    api.RouterMiddleware
	cardsAPI      api.Handlers
	dashboardsAPI api.Handlers
	chartsAPI     api.Handlers
	searchAPI     api.Handlers
	videoAPI      api.Handlers
}

func (b *serviceBuilder) Middlewares() []api.RouterMiddleware {
	return []api.RouterMiddleware{b.rateLimiter, b.auth, b.auditTrail}
}

func (b *serviceBuilder) Handlers() []api.Handlers {
	return []api.Handlers{b.chartsAPI, b.dashboardsAPI, b.cardsAPI, b.searchAPI, b.videoAPI}
}

func NewServiceBuilder(log logger.Logger, cfg *analytics.Config, webMetrics web.Web, dbMetrics database.Database, pgconn pool.Pool, chConn driver.Conn) (api.ServiceBuilder, error) {
	responser := api.NewResponser(webMetrics)
	audiTrail, err := tracer.NewTracer(log, pgconn, dbMetrics)
	if err != nil {
		return nil, err
	}
	reqValidator := validator.New()
	reqValidator.RegisterStructValidation(model.ValidateMetricFields, model.MetricPayload{})

	searchService, err := search.New(chConn)
	if err != nil {
		return nil, err
	}
	searchHandlers, err := search.NewHandlers(log, cfg, responser, searchService, reqValidator)
	if err != nil {
		return nil, err
	}

	cardsService := cards.New(log, pgconn)
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

	chartsService, err := charts.New(chConn)
	if err != nil {
		return nil, err
	}
	chartsHandlers, err := charts.NewHandlers(log, cfg, responser, chartsService, cardsService, reqValidator)
	if err != nil {
		return nil, err
	}

	videoHandlers, err := session_videos.NewHandlers(log, cfg, responser, session_videos.New(log, cfg, pgconn), reqValidator)
	if err != nil {
		return nil, err
	}

	return &serviceBuilder{
		auth:          auth.NewAuth(log, cfg.JWTSecret, "", pgconn, nil, api.NoPrefix),
		rateLimiter:   limiter.NewUserRateLimiter(&cfg.RateLimiter),
		auditTrail:    audiTrail,
		cardsAPI:      cardsHandlers,
		dashboardsAPI: dashboardsHandlers,
		chartsAPI:     chartsHandlers,
		searchAPI:     searchHandlers,
		videoAPI:      videoHandlers,
	}, nil
}
