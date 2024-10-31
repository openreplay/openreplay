package data_integration

import (
	"openreplay/backend/internal/config/integrations"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/flakeid"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/objectstorage"
	"openreplay/backend/pkg/objectstorage/store"
	"openreplay/backend/pkg/spot/auth"
)

type ServiceBuilder struct {
	Flaker     *flakeid.Flaker
	ObjStorage objectstorage.ObjectStorage
	Auth       auth.Auth
	Integrator Service
}

func NewServiceBuilder(log logger.Logger, cfg *integrations.Config, pgconn pool.Pool) (*ServiceBuilder, error) {
	objStore, err := store.NewStore(&cfg.ObjectsConfig)
	if err != nil {
		return nil, err
	}
	integrator, err := NewService(log, pgconn, objStore)
	if err != nil {
		return nil, err
	}
	flaker := flakeid.NewFlaker(cfg.WorkerID)
	return &ServiceBuilder{
		Flaker:     flaker,
		ObjStorage: objStore,
		Auth:       auth.NewAuth(log, cfg.JWTSecret, "", pgconn),
		Integrator: integrator,
	}, nil
}
