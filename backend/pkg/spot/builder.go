package spot

import (
	"openreplay/backend/internal/config/spot"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/flakeid"
	"openreplay/backend/pkg/logger"
	spotMetrics "openreplay/backend/pkg/metrics/spot"
	"openreplay/backend/pkg/metrics/web"
	"openreplay/backend/pkg/objectstorage/store"
	"openreplay/backend/pkg/server/api"
	spotAPI "openreplay/backend/pkg/spot/api"
	"openreplay/backend/pkg/spot/keys"
	"openreplay/backend/pkg/spot/service"
	"openreplay/backend/pkg/spot/transcoder"
)

type serviceBuilder struct {
	spotsAPI api.Handlers
}

func (b *serviceBuilder) Handlers() []api.Handlers {
	return []api.Handlers{b.spotsAPI}
}

func NewServiceBuilder(log logger.Logger, cfg *spot.Config, webMetrics web.Web, spotMetrics spotMetrics.Spot, pgconn pool.Pool, prefix string) (api.ServiceBuilder, error) {
	objStore, err := store.NewStore(&cfg.ObjectsConfig)
	if err != nil {
		return nil, err
	}
	flaker := flakeid.NewFlaker(cfg.WorkerID)
	spots := service.NewSpots(log, pgconn, flaker)
	transcoder := transcoder.NewTranscoder(cfg, log, objStore, pgconn, spots, spotMetrics)
	keys := keys.NewKeys(log, pgconn)
	responser := api.NewResponser(webMetrics)
	handlers, err := spotAPI.NewHandlers(log, cfg, responser, spots, objStore, transcoder, keys)
	if err != nil {
		return nil, err
	}
	return &serviceBuilder{
		spotsAPI: handlers,
	}, nil
}
