package assist

import (
	"time"

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
	"openreplay/backend/pkg/server/limiter"
	"openreplay/backend/pkg/sessionmanager"
)

type ServicesBuilder struct {
	RateLimiter *limiter.UserRateLimiter
	AssistAPI   api.Handlers
}

func NewServiceBuilder(log logger.Logger, cfg *assist.Config, webMetrics web.Web, dbMetrics database.Database, pgconn pool.Pool, redis *redis.Client) (*ServicesBuilder, error) {
	projectsManager := projects.New(log, pgconn, redis, dbMetrics)
	sessManager, err := sessionmanager.New(log, cfg, redis.Redis)
	if err != nil {
		return nil, err
	}
	sessManager.Start()
	assistManager := service.NewAssist(log, pgconn, projectsManager, sessManager)
	responser := api.NewResponser(webMetrics)
	handlers, err := assistAPI.NewHandlers(log, cfg, responser, assistManager)
	if err != nil {
		return nil, err
	}
	return &ServicesBuilder{
		RateLimiter: limiter.NewUserRateLimiter(10, 30, 1*time.Minute, 5*time.Minute),
		AssistAPI:   handlers,
	}, nil
}
