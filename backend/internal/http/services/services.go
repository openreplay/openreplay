package services

import (
	"openreplay/backend/internal/config/http"
	"openreplay/backend/internal/http/geoip"
	"openreplay/backend/internal/http/uaparser"
	"openreplay/backend/pkg/db/cache"
	"openreplay/backend/pkg/flakeid"
	"openreplay/backend/pkg/queue/types"
	"openreplay/backend/pkg/storage"
	"openreplay/backend/pkg/token"
)

type ServicesBuilder struct {
	Database  *cache.PGCache
	Producer  types.Producer
	Flaker    *flakeid.Flaker
	UaParser  *uaparser.UAParser
	GeoIP     geoip.GeoParser
	Tokenizer *token.Tokenizer
	Storage   *storage.S3
}

func New(cfg *http.Config, producer types.Producer, pgconn *cache.PGCache) *ServicesBuilder {
	return &ServicesBuilder{
		Database:  pgconn,
		Producer:  producer,
		Storage:   storage.NewS3(cfg.AWSRegion, cfg.S3BucketIOSImages, cfg.UseFileTags()),
		Tokenizer: token.NewTokenizer(cfg.TokenSecret),
		UaParser:  uaparser.NewUAParser(cfg.UAParserFile),
		GeoIP:     geoip.New(cfg.MaxMinDBFile),
		Flaker:    flakeid.NewFlaker(cfg.WorkerID),
	}
}
