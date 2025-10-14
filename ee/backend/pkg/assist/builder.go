package assist

import (
	"openreplay/backend/internal/config/assist"
	assistAPI "openreplay/backend/pkg/assist/api"
	"openreplay/backend/pkg/assist/service"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/db/redis"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/metrics/database"
	"openreplay/backend/pkg/metrics/web"
	"openreplay/backend/pkg/projects"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/sessionmanager"
)

type serviceBuilder struct {
	assistAPI   api.Handlers
	assistStats service.AssistStats
}

func (b *serviceBuilder) Handlers() []api.Handlers {
	return []api.Handlers{b.assistAPI}
}

func NewServiceBuilder(log logger.Logger, cfg *assist.Config, webMetrics web.Web, dbMetrics database.Database, pgconn pool.Pool, redis *redis.Client) (api.ServiceBuilder, error) {
	projectsManager := projects.New(log, pgconn, redis, dbMetrics)
	sessManager, err := sessionmanager.New(log, cfg, redis.Redis)
	if err != nil {
		return nil, err
	}
	sessManager.Start()
	assistStats, err := service.NewAssistStats(log, pgconn, redis.Redis)
	if err != nil {
		return nil, err
	}
	assistManager := service.NewAssist(log, pgconn, projectsManager, sessManager)
	responser := api.NewResponser(webMetrics)
	handlers, err := assistAPI.NewHandlers(log, cfg, responser, assistManager)
	if err != nil {
		return nil, err
	}
	return &serviceBuilder{
		assistAPI:   handlers,
		assistStats: assistStats,
	}, nil
}
