package service

import (
	"openreplay/backend/internal/config/spot"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/flakeid"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/objectstorage"
	"openreplay/backend/pkg/objectstorage/store"
	"openreplay/backend/pkg/spot/auth"
)

type ServicesBuilder struct {
	Flaker     *flakeid.Flaker
	ObjStorage objectstorage.ObjectStorage
	Auth       auth.Auth
	Spots      Spots
	Keys       Keys
	Transcoder Transcoder
	Tracer     Tracer
}

func NewServiceBuilder(log logger.Logger, cfg *spot.Config, pgconn pool.Pool) (*ServicesBuilder, error) {
	objStore, err := store.NewStore(&cfg.ObjectsConfig)
	if err != nil {
		return nil, err
	}
	flaker := flakeid.NewFlaker(cfg.WorkerID)
	tracer, err := NewTracer(log, pgconn)
	if err != nil {
		return nil, err
	}
	return &ServicesBuilder{
		Flaker:     flaker,
		ObjStorage: objStore,
		Auth:       auth.NewAuth(log, cfg.JWTSecret, pgconn),
		Spots:      NewSpots(log, pgconn, flaker),
		Keys:       NewKeys(log, pgconn),
		Transcoder: NewTranscoder(cfg, log, objStore, pgconn),
		Tracer:     tracer,
	}, nil
}
