package videoreplays

import (
	"openreplay/backend/pkg/sessions"

	"github.com/go-playground/validator/v10"

	videoConfig "openreplay/backend/internal/config/videoreplays"
	"openreplay/backend/pkg/analytics/model"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/metrics/database"
	"openreplay/backend/pkg/metrics/web"
	"openreplay/backend/pkg/objectstorage"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/server/auth"
	"openreplay/backend/pkg/server/keys"
	"openreplay/backend/pkg/server/limiter"
	"openreplay/backend/pkg/server/tracer"
	videoReplayHandlers "openreplay/backend/pkg/videoreplays/api"
	"openreplay/backend/pkg/videoreplays/service"
)

type serviceBuilder struct {
	auth         api.RouterMiddleware
	rateLimiter  api.RouterMiddleware
	auditTrail   api.RouterMiddleware
	videoAPI     api.Handlers
	VideoService service.SessionVideos
}

func (b *serviceBuilder) Middlewares() []api.RouterMiddleware {
	return []api.RouterMiddleware{b.rateLimiter, b.auth, b.auditTrail}
}

func (b *serviceBuilder) Handlers() []api.Handlers {
	return []api.Handlers{b.videoAPI}
}

func NewServiceBuilder(log logger.Logger, cfg *videoConfig.Config, sessions sessions.Sessions, webMetrics web.Web, dbMetrics database.Database, pgconn pool.Pool, objStore objectstorage.ObjectStorage) (*serviceBuilder, error) {
	responser := api.NewResponser(webMetrics)
	audiTrail, err := tracer.NewTracer(log, pgconn, dbMetrics)
	if err != nil {
		return nil, err
	}
	reqValidator := validator.New()
	reqValidator.RegisterStructValidation(model.ValidateMetricFields, model.MetricPayload{})

	keysService := keys.NewKeys(log, pgconn)
	authService := auth.NewAuth(log, cfg.JWTSecret, "", pgconn, keysService, api.NoPrefix)

	batchJobs, err := service.NewSessionBatchService(log, cfg)
	if err != nil {
		return nil, err
	}
	videoStorage, err := service.NewStorage(log, pgconn)
	if err != nil {
		return nil, err
	}
	videoService, err := service.New(log, cfg, videoStorage, batchJobs, authService, objStore)
	if err != nil {
		return nil, err
	}
	videoHandlers, err := videoReplayHandlers.NewHandlers(log, cfg, responser, sessions, videoService, reqValidator)
	if err != nil {
		return nil, err
	}

	return &serviceBuilder{
		auth:         authService,
		rateLimiter:  limiter.NewUserRateLimiter(&cfg.RateLimiter),
		auditTrail:   audiTrail,
		videoAPI:     videoHandlers,
		VideoService: videoService,
	}, nil
}
