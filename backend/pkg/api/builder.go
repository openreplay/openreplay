package api

import (
	"fmt"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/go-playground/validator/v10"

	config "openreplay/backend/internal/config/api"
	"openreplay/backend/pkg/analytics/cards"
	"openreplay/backend/pkg/analytics/charts"
	"openreplay/backend/pkg/analytics/dashboards"
	"openreplay/backend/pkg/analytics/model"
	"openreplay/backend/pkg/analytics/saved_searches"
	"openreplay/backend/pkg/analytics/search"
	"openreplay/backend/pkg/api_key"
	"openreplay/backend/pkg/assist/proxy"
	"openreplay/backend/pkg/canvas"
	"openreplay/backend/pkg/conditions"
	conditionsApi "openreplay/backend/pkg/conditions/projects_api"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/events"
	eventAPI "openreplay/backend/pkg/events/api"
	"openreplay/backend/pkg/favorite"
	favoriteAPI "openreplay/backend/pkg/favorite/api"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/metrics/web"
	"openreplay/backend/pkg/notes"
	noteAPI "openreplay/backend/pkg/notes/api"
	"openreplay/backend/pkg/objectstorage"
	"openreplay/backend/pkg/projects"
	replayAPI "openreplay/backend/pkg/replays/api"
	"openreplay/backend/pkg/replays/service"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/session"
	sessionAPI "openreplay/backend/pkg/session/api"
	"openreplay/backend/pkg/views"
)

type serviceBuilder struct {
	sessionAPI       api.Handlers
	eventAPI         api.Handlers
	favoriteAPI      api.Handlers
	noteAPI          api.Handlers
	replayAPI        api.Handlers
	apiKeyAPI        api.Handlers
	conditionsAPI    api.Handlers
	cardsAPI         api.Handlers
	dashboardsAPI    api.Handlers
	chartsAPI        api.Handlers
	searchAPI        api.Handlers
	savedSearchesAPI api.Handlers
}

func (b *serviceBuilder) Handlers() []api.Handlers {
	return []api.Handlers{b.sessionAPI, b.eventAPI, b.favoriteAPI, b.noteAPI, b.replayAPI, b.apiKeyAPI, b.conditionsAPI,
		b.chartsAPI, b.dashboardsAPI, b.cardsAPI, b.searchAPI, b.savedSearchesAPI}
}

func NewServiceBuilder(log logger.Logger, cfg *config.Config, webMetrics web.Web, pgconn pool.Pool, chconn clickhouse.Conn, objStore objectstorage.ObjectStorage, projects projects.Projects, canvases canvas.Canvases) (api.ServiceBuilder, error) {
	responser := api.NewResponser(webMetrics)

	reqValidator := validator.New()
	reqValidator.RegisterStructValidation(model.ValidateMetricFields, model.MetricPayload{})
	reqValidator.RegisterStructValidation(model.ValidateFilterFields, model.Filter{})

	viewService, err := views.New(pgconn, chconn)
	if err != nil {
		return nil, fmt.Errorf("failed to create view service: %s", err)
	}

	assistProxy, err := proxy.New(log, cfg, projects)
	if err != nil {
		return nil, fmt.Errorf("failed to create assist proxy: %s", err)
	}

	files, err := service.New(log, cfg, objStore, canvases)
	if err != nil {
		return nil, err
	}

	sessionService, err := session.NewService(log, pgconn, viewService, files)
	if err != nil {
		return nil, fmt.Errorf("can't init session service: %s", err)
	}
	sessionHandlers, err := sessionAPI.NewHandlers(log, cfg, responser, sessionService, assistProxy, files)
	if err != nil {
		return nil, err
	}

	eventService, err := events.New(log, chconn)
	if err != nil {
		return nil, err
	}
	eventHandlers, err := eventAPI.NewHandlers(log, &cfg.HTTP, responser, eventService, sessionService)
	if err != nil {
		return nil, err
	}

	favService, err := favorite.New(log, pgconn, objStore)
	if err != nil {
		return nil, err
	}
	favHandlers, err := favoriteAPI.NewHandlers(log, responser, favService)
	if err != nil {
		return nil, err
	}

	noteService, err := notes.New(log, pgconn)
	if err != nil {
		return nil, err
	}
	noteHandlers, err := noteAPI.NewHandlers(log, &cfg.HTTP, responser, noteService)
	if err != nil {
		return nil, err
	}

	replayHandlers, err := replayAPI.NewHandlers(log, responser, sessionService, files)
	if err != nil {
		return nil, err
	}

	apiKeyHandlers, err := api_key.NewHandlers(log, &cfg.HTTP, responser, projects)
	if err != nil {
		return nil, err
	}

	conditionsService := conditions.New(pgconn)
	conditionsHandlers, err := conditionsApi.NewHandlers(log, &cfg.HTTP, responser, conditionsService)
	if err != nil {
		return nil, err
	}

	searchService, err := search.New(log, chconn, pgconn)
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

	chartsService, err := charts.New(log, chconn)
	if err != nil {
		return nil, err
	}
	chartsHandlers, err := charts.NewHandlers(log, cfg, responser, chartsService, cardsService, reqValidator)
	if err != nil {
		return nil, err
	}

	savedSearchesService := saved_searches.New(log, pgconn)
	savedSearchesHandlers, err := saved_searches.NewHandlers(log, cfg, responser, savedSearchesService, reqValidator)
	if err != nil {
		return nil, err
	}

	return &serviceBuilder{
		sessionAPI:       sessionHandlers,
		eventAPI:         eventHandlers,
		favoriteAPI:      favHandlers,
		noteAPI:          noteHandlers,
		replayAPI:        replayHandlers,
		apiKeyAPI:        apiKeyHandlers,
		conditionsAPI:    conditionsHandlers,
		cardsAPI:         cardsHandlers,
		dashboardsAPI:    dashboardsHandlers,
		chartsAPI:        chartsHandlers,
		searchAPI:        searchHandlers,
		savedSearchesAPI: savedSearchesHandlers,
	}, nil
}
