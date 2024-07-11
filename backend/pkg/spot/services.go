package spot

import (
	"openreplay/backend/internal/config/spot"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/flakeid"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/objectstorage"
	"openreplay/backend/pkg/objectstorage/store"
)

type ServicesBuilder struct {
	Flaker     *flakeid.Flaker
	ObjStorage objectstorage.ObjectStorage
	Auth       Auth
	Spots      Spots
	Transcoder Transcoder
}

func NewServiceBuilder(log logger.Logger, cfg *spot.Config, pgconn pool.Pool) (*ServicesBuilder, error) {
	objStore, err := store.NewStore(&cfg.ObjectsConfig)
	if err != nil {
		return nil, err
	}
	flaker := flakeid.NewFlaker(cfg.WorkerID)
	return &ServicesBuilder{
		Flaker:     flaker,
		ObjStorage: objStore,
		Auth:       NewAuth(log, cfg.JWTSecret, pgconn),
		Spots:      NewSpots(log, pgconn, flaker),
		Transcoder: NewTranscoder(cfg, log, objStore),
	}, nil
}
