package main

import (
	"openreplay/backend/pkg/db/cache"
	"openreplay/backend/pkg/flakeid"
	"openreplay/backend/pkg/queue/types"
	"openreplay/backend/pkg/storage"
	"openreplay/backend/pkg/token"
	"openreplay/backend/pkg/url/assets"
	"openreplay/backend/services/http/geoip"
	"openreplay/backend/services/http/uaparser"
)

type ServiceBuilder struct {
	pgconn    *cache.PGCache
	producer  types.Producer
	rewriter  *assets.Rewriter
	flaker    *flakeid.Flaker
	uaParser  *uaparser.UAParser
	geoIP     *geoip.GeoIP
	tokenizer *token.Tokenizer
	s3        *storage.S3
}

func NewServiceBuilder(cfg *config, producer types.Producer, pgconn *cache.PGCache) *ServiceBuilder {
	return &ServiceBuilder{
		pgconn:    pgconn,
		producer:  producer,
		rewriter:  assets.NewRewriter(cfg.AssetsOrigin),
		s3:        storage.NewS3(cfg.AWSRegion, cfg.S3BucketIOSImages),
		tokenizer: token.NewTokenizer(cfg.TokenSecret),
		uaParser:  uaparser.NewUAParser(cfg.UAParserFile),
		geoIP:     geoip.NewGeoIP(cfg.MaxMinDBFile),
		flaker:    flakeid.NewFlaker(cfg.WorkerID),
	}
}
