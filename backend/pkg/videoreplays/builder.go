package videoreplays

import (
	"openreplay/backend/pkg/server/user"
	"openreplay/backend/pkg/sessions"

	"github.com/go-playground/validator/v10"

	videoConfig "openreplay/backend/internal/config/videoreplays"
	"openreplay/backend/pkg/analytics/model"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/metrics/web"
	"openreplay/backend/pkg/objectstorage"
	"openreplay/backend/pkg/server/api"
	videoReplayHandlers "openreplay/backend/pkg/videoreplays/api"
	"openreplay/backend/pkg/videoreplays/service"
)

type serviceBuilder struct {
	videoAPI     api.Handlers
	VideoService service.SessionVideos
}

func (b *serviceBuilder) Handlers() []api.Handlers {
	return []api.Handlers{b.videoAPI}
}

func NewServiceBuilder(log logger.Logger, cfg *videoConfig.Config, sessions sessions.Sessions, webMetrics web.Web, pgconn pool.Pool, objStore objectstorage.ObjectStorage) (*serviceBuilder, error) {
	responser := api.NewResponser(webMetrics)
	reqValidator := validator.New()
	reqValidator.RegisterStructValidation(model.ValidateMetricFields, model.MetricPayload{})

	batchJobs, err := service.NewSessionBatchService(log, cfg)
	if err != nil {
		return nil, err
	}

	videoStorage, err := service.NewStorage(log, pgconn)
	if err != nil {
		return nil, err
	}

	users := user.New(pgconn)

	videoService, err := service.New(log, cfg, videoStorage, batchJobs, objStore, users)
	if err != nil {
		return nil, err
	}

	videoHandlers, err := videoReplayHandlers.NewHandlers(log, cfg, responser, sessions, videoService, reqValidator)
	if err != nil {
		return nil, err
	}

	return &serviceBuilder{
		videoAPI:     videoHandlers,
		VideoService: videoService,
	}, nil
}
