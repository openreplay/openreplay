package analytics

import (
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/go-playground/validator/v10"

	"openreplay/backend/internal/config/analytics"
	"openreplay/backend/pkg/analytics/cards"
	"openreplay/backend/pkg/analytics/charts"
	"openreplay/backend/pkg/analytics/dashboards"
	"openreplay/backend/pkg/analytics/search"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/metrics/web"
	"openreplay/backend/pkg/server/api"
)

type serviceBuilder struct {
	cardsAPI      api.Handlers
	dashboardsAPI api.Handlers
	chartsAPI     api.Handlers
	searchAPI     api.Handlers
}

func (b *serviceBuilder) Handlers() []api.Handlers {
	return []api.Handlers{b.chartsAPI, b.dashboardsAPI, b.cardsAPI, b.searchAPI}
}

func NewServiceBuilder(log logger.Logger, cfg *analytics.Config, webMetrics web.Web, pgconn pool.Pool, chConn driver.Conn) (api.ServiceBuilder, error) {
	responser := api.NewResponser(webMetrics)
	reqValidator := validator.New()

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

	return &serviceBuilder{
		cardsAPI:      cardsHandlers,
		dashboardsAPI: dashboardsHandlers,
		chartsAPI:     chartsHandlers,
		searchAPI:     searchHandlers,
	}, nil
}
