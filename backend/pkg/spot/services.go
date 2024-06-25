package spot

import (
	"openreplay/backend/internal/config/spot"
	"openreplay/backend/internal/http/geoip"
	"openreplay/backend/internal/http/uaparser"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/flakeid"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/objectstorage"
	"openreplay/backend/pkg/objectstorage/store"
)

type ServicesBuilder struct {
	Flaker     *flakeid.Flaker
	UaParser   *uaparser.UAParser
	GeoIP      geoip.GeoParser
	ObjStorage objectstorage.ObjectStorage
	Auth       Auth
	Spots      Spots
}

func NewServiceBuilder(log logger.Logger, cfg *spot.Config, pgconn pool.Pool) (*ServicesBuilder, error) {
	// ObjectStorage client to generate pre-signed upload urls
	objStore, err := store.NewStore(&cfg.ObjectsConfig)
	if err != nil {
		return nil, err
	}
	geoModule, err := geoip.New(cfg.MaxMinDBFile)
	if err != nil {
		return nil, err
	}
	uaModule, err := uaparser.NewUAParser(cfg.UAParserFile)
	if err != nil {
		return nil, err
	}
	flaker := flakeid.NewFlaker(cfg.WorkerID)
	return &ServicesBuilder{
		UaParser:   uaModule,
		GeoIP:      geoModule,
		Flaker:     flaker,
		ObjStorage: objStore,
		Auth:       NewAuth(log, cfg.JWTSecret, pgconn),
		Spots:      NewSpots(log, pgconn, flaker),
	}, nil
}
