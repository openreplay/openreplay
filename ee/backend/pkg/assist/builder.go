package assist

import (
	"openreplay/backend/pkg/db/redis"
	"openreplay/backend/pkg/projects"
	"openreplay/backend/pkg/sessionmanager"
	"time"

	"openreplay/backend/internal/config/assist"
	assistAPI "openreplay/backend/pkg/assist/api"
	"openreplay/backend/pkg/assist/service"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/metrics/database"
	"openreplay/backend/pkg/metrics/web"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/server/auth"
	"openreplay/backend/pkg/server/limiter"
	"openreplay/backend/pkg/server/tracer"
)

type ServicesBuilder struct {
	Auth        auth.Auth
	RateLimiter *limiter.UserRateLimiter
	AuditTrail  tracer.Tracer
	AssistAPI   api.Handlers
}

func NewServiceBuilder(log logger.Logger, cfg *assist.Config, webMetrics web.Web, dbMetrics database.Database, pgconn pool.Pool, redis *redis.Client, prefix string) (*ServicesBuilder, error) {
	projectsManager := projects.New(log, pgconn, redis, dbMetrics)
	sessManager, err := sessionmanager.New(log, redis.Redis)
	if err != nil {
		return nil, err
	}
	sessManager.Start()
	assist := service.NewAssist(log, pgconn, projectsManager, sessManager)
	auditrail, err := tracer.NewTracer(log, pgconn, dbMetrics)
	if err != nil {
		return nil, err
	}
	responser := api.NewResponser(webMetrics)
	handlers, err := assistAPI.NewHandlers(log, cfg, responser, assist)
	if err != nil {
		return nil, err
	}
	return &ServicesBuilder{
		Auth:        auth.NewAuth(log, cfg.JWTSecret, cfg.JWTSpotSecret, pgconn, nil, prefix),
		RateLimiter: limiter.NewUserRateLimiter(10, 30, 1*time.Minute, 5*time.Minute),
		AuditTrail:  auditrail,
		AssistAPI:   handlers,
	}, nil
}
