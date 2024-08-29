package spot

import (
	"openreplay/backend/internal/config/spot"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/flakeid"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/objectstorage"
	"openreplay/backend/pkg/objectstorage/store"
	"openreplay/backend/pkg/spot/auth"
	"openreplay/backend/pkg/spot/service"
	"openreplay/backend/pkg/spot/transcoder"
)

type ServicesBuilder struct {
	Flaker     *flakeid.Flaker
	ObjStorage objectstorage.ObjectStorage
	Auth       auth.Auth
	Spots      service.Spots
	Keys       service.Keys
	Transcoder transcoder.Transcoder
	Tracer     service.Tracer
}

func NewServiceBuilder(log logger.Logger, cfg *spot.Config, pgconn pool.Pool) (*ServicesBuilder, error) {
	objStore, err := store.NewStore(&cfg.ObjectsConfig)
	if err != nil {
		return nil, err
	}
	flaker := flakeid.NewFlaker(cfg.WorkerID)
	tracer, err := service.NewTracer(log, pgconn)
	if err != nil {
		return nil, err
	}
	spots := service.NewSpots(log, pgconn, flaker)
	return &ServicesBuilder{
		Flaker:     flaker,
		ObjStorage: objStore,
		Auth:       auth.NewAuth(log, cfg.JWTSecret, cfg.JWTSpotSecret, pgconn),
		Spots:      spots,
		Keys:       service.NewKeys(log, pgconn),
		Transcoder: transcoder.NewTranscoder(cfg, log, objStore, pgconn, spots),
		Tracer:     tracer,
	}, nil
}
