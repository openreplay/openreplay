package spot

import (
	"openreplay/backend/internal/config/spot"
	"openreplay/backend/pkg/common"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/spot/service"
	"openreplay/backend/pkg/spot/transcoder"
)

type ServicesBuilder struct {
	*common.ServicesBuilder
	Spots      service.Spots
	Keys       service.Keys
	Transcoder transcoder.Transcoder
	cfg        *spot.Config
}

func NewServiceBuilder(log logger.Logger, cfg *spot.Config) (*ServicesBuilder, error) {
	builder := common.NewServiceBuilder(log).
		WithDatabase(cfg.Postgres.String()).
		WithAuth(cfg.JWTSecret, cfg.JWTSpotSecret).
		WithObjectStorage(&cfg.ObjectsConfig)

	keys := service.NewKeys(log, builder.Pgconn)
	spots := service.NewSpots(log, builder.Pgconn, builder.Flaker)
	tc := transcoder.NewTranscoder(cfg, log, builder.ObjStorage, builder.Pgconn, spots)

	return &ServicesBuilder{
		ServicesBuilder: builder,
		Spots:           spots,
		Keys:            keys,
		Transcoder:      tc,
		cfg:             cfg,
	}, nil
}
