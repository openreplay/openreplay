package services

import (
	"fmt"

	"openreplay/backend/internal/config/http"
	"openreplay/backend/internal/http/geoip"
	"openreplay/backend/internal/http/uaparser"
	"openreplay/backend/pkg/db/cache"
	"openreplay/backend/pkg/flakeid"
	"openreplay/backend/pkg/objectstorage"
	"openreplay/backend/pkg/objectstorage/store"
	"openreplay/backend/pkg/queue/types"
	"openreplay/backend/pkg/token"
)

type ServicesBuilder struct {
	Database  *cache.PGCache
	Producer  types.Producer
	Flaker    *flakeid.Flaker
	UaParser  *uaparser.UAParser
	GeoIP     geoip.GeoParser
	Tokenizer *token.Tokenizer
	Storage   objectstorage.ObjectStorage
}

func New(cfg *http.Config, producer types.Producer, pgconn *cache.PGCache) (*ServicesBuilder, error) {
	objStore, err := store.NewStore(&cfg.ObjectsConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize object storage: %v", err)
	}
	return &ServicesBuilder{
		Database:  pgconn,
		Producer:  producer,
		Storage:   objStore,
		Tokenizer: token.NewTokenizer(cfg.TokenSecret),
		UaParser:  uaparser.NewUAParser(cfg.UAParserFile),
		GeoIP:     geoip.New(cfg.MaxMinDBFile),
		Flaker:    flakeid.NewFlaker(cfg.WorkerID),
	}, nil
}
