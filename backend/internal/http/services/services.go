package services

import (
	"log"
	"openreplay/backend/internal/config/http"
	"openreplay/backend/internal/http/geoip"
	"openreplay/backend/internal/http/uaparser"
	"openreplay/backend/pkg/conditions"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/db/redis"
	"openreplay/backend/pkg/featureflags"
	"openreplay/backend/pkg/flakeid"
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

func New(cfg *http.Config, producer types.Producer, pgconn pool.Pool, redis *redis.Client) (*ServicesBuilder, error) {
	projs := projects.New(pgconn, redis)
	// ObjectStorage client to generate pre-signed upload urls
	objStore, err := store.NewStore(&cfg.ObjectsConfig)
	if err != nil {
		log.Fatalf("can't init object storage: %s", err)
	}
	return &ServicesBuilder{
		Projects:     projs,
		Sessions:     sessions.New(pgconn, projs, redis),
		FeatureFlags: featureflags.New(pgconn),
		Producer:     producer,
		Tokenizer:    token.NewTokenizer(cfg.TokenSecret),
		UaParser:     uaparser.NewUAParser(cfg.UAParserFile),
		GeoIP:        geoip.New(cfg.MaxMinDBFile),
		Flaker:       flakeid.NewFlaker(cfg.WorkerID),
		ObjStorage:   objStore,
		UXTesting:    uxtesting.New(pgconn),
		Tags:         tags.New(pgconn),
		Conditions:   conditions.New(pgconn),
	}, nil
}
