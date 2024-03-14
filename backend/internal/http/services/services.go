package services

import (
	"openreplay/backend/internal/config/http"
	"openreplay/backend/internal/http/geoip"
	"openreplay/backend/internal/http/uaparser"
	"openreplay/backend/pkg/conditions"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/db/redis"
	"openreplay/backend/pkg/featureflags"
	"openreplay/backend/pkg/flakeid"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/objectstorage"
	"openreplay/backend/pkg/objectstorage/store"
	"openreplay/backend/pkg/projects"
	"openreplay/backend/pkg/queue/types"
	"openreplay/backend/pkg/sessions"
	"openreplay/backend/pkg/tags"
	"openreplay/backend/pkg/token"
	"openreplay/backend/pkg/uxtesting"
)

type ServicesBuilder struct {
	Projects     projects.Projects
	Sessions     sessions.Sessions
	FeatureFlags featureflags.FeatureFlags
	Producer     types.Producer
	Flaker       *flakeid.Flaker
	UaParser     *uaparser.UAParser
	GeoIP        geoip.GeoParser
	Tokenizer    *token.Tokenizer
	ObjStorage   objectstorage.ObjectStorage
	UXTesting    uxtesting.UXTesting
	Tags         tags.Tags
	Conditions   conditions.Conditions
}

func New(log logger.Logger, cfg *http.Config, producer types.Producer, pgconn pool.Pool, redis *redis.Client) (*ServicesBuilder, error) {
	projs := projects.New(log, pgconn, redis)
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
	return &ServicesBuilder{
		Projects:     projs,
		Sessions:     sessions.New(log, pgconn, projs, redis),
		FeatureFlags: featureflags.New(pgconn),
		Producer:     producer,
		Tokenizer:    token.NewTokenizer(cfg.TokenSecret),
		UaParser:     uaModule,
		GeoIP:        geoModule,
		Flaker:       flakeid.NewFlaker(cfg.WorkerID),
		ObjStorage:   objStore,
		UXTesting:    uxtesting.New(pgconn),
		Tags:         tags.New(log, pgconn),
		Conditions:   conditions.New(pgconn),
	}, nil
}
