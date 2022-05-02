package http

import (
	"openreplay/backend/internal/config"
	"openreplay/backend/internal/http/geoip"
	"openreplay/backend/internal/http/uaparser"
	"openreplay/backend/pkg/db/cache"
	"openreplay/backend/pkg/flakeid"
	"openreplay/backend/pkg/queue/types"
	"openreplay/backend/pkg/storage"
	"openreplay/backend/pkg/token"
	"openreplay/backend/pkg/url/assets"
)

type ServiceBuilder struct {
	Pgconn    *cache.PGCache
	Producer  types.Producer
	Rewriter  *assets.Rewriter
	Flaker    *flakeid.Flaker
	UaParser  *uaparser.UAParser
	GeoIP     *geoip.GeoIP
	Tokenizer *token.Tokenizer
	S3        *storage.S3
}

func NewServiceBuilder(cfg *config.Config, producer types.Producer, pgconn *cache.PGCache) *ServiceBuilder {
	return &ServiceBuilder{
		Pgconn:    pgconn,
		Producer:  producer,
		Rewriter:  assets.NewRewriter(cfg.AssetsOrigin),
		S3:        storage.NewS3(cfg.AWSRegion, cfg.S3BucketIOSImages),
		Tokenizer: token.NewTokenizer(cfg.TokenSecret),
		UaParser:  uaparser.NewUAParser(cfg.UAParserFile),
		GeoIP:     geoip.NewGeoIP(cfg.MaxMinDBFile),
		Flaker:    flakeid.NewFlaker(cfg.WorkerID),
	}
}
