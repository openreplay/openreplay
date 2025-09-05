package api

import (
	"fmt"

	"github.com/ClickHouse/clickhouse-go/v2"

	config "openreplay/backend/internal/config/session"
	"openreplay/backend/pkg/assist/proxy"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/events"
	eventAPI "openreplay/backend/pkg/events/api"
	"openreplay/backend/pkg/favorite"
	favoriteAPI "openreplay/backend/pkg/favorite/api"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/metrics/database"
	"openreplay/backend/pkg/metrics/web"
	"openreplay/backend/pkg/notes"
	noteAPI "openreplay/backend/pkg/notes/api"
	"openreplay/backend/pkg/objectstorage"
	"openreplay/backend/pkg/projects"
	replayAPI "openreplay/backend/pkg/replays/api"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/session"
	sessionAPI "openreplay/backend/pkg/session/api"
	"openreplay/backend/pkg/views"
)

type serviceBuilder struct {
	sessionAPI  api.Handlers
	eventAPI    api.Handlers
	favoriteAPI api.Handlers
	noteAPI     api.Handlers
	replayAPI   api.Handlers
}

func (b *serviceBuilder) Handlers() []api.Handlers {
	return []api.Handlers{b.sessionAPI, b.eventAPI, b.favoriteAPI, b.noteAPI, b.replayAPI}
}

func NewServiceBuilder(log logger.Logger, cfg *config.Config, webMetrics web.Web, dbMetrics database.Database, pgconn pool.Pool, chconn clickhouse.Conn, objStore objectstorage.ObjectStorage) (api.ServiceBuilder, error) {
	projectService := projects.New(log, pgconn, nil, dbMetrics)
	responser := api.NewResponser(webMetrics)

	viewService, err := views.New(pgconn, chconn)
	if err != nil {
		return nil, fmt.Errorf("failed to create view service: %s", err)
	}

	assistProxy, err := proxy.New(log, cfg, projectService)
	if err != nil {
		return nil, fmt.Errorf("failed to create assist proxy: %s", err)
	}

	sessionService, err := session.NewService(log, pgconn, viewService, objStore)
	if err != nil {
		return nil, fmt.Errorf("can't init session service: %s", err)
	}
	sessionHandlers, err := sessionAPI.NewHandlers(log, cfg, responser, sessionService, assistProxy)
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

	favService, err := favorite.New(log, pgconn)
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

	replayHandlers, err := replayAPI.NewHandlers(log, responser, sessionService)
	if err != nil {
		return nil, err
	}

	return &serviceBuilder{
		sessionAPI:  sessionHandlers,
		eventAPI:    eventHandlers,
		favoriteAPI: favHandlers,
		noteAPI:     noteHandlers,
		replayAPI:   replayHandlers,
	}, nil
}
