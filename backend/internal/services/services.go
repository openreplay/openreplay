package services

import (
	"openreplay/backend/internal/assetscache"
	"openreplay/backend/internal/config"
	"openreplay/backend/internal/geoip"
	"openreplay/backend/internal/uaparser"
	"openreplay/backend/pkg/db/cache"
	"openreplay/backend/pkg/flakeid"
	"openreplay/backend/pkg/queue/types"
	"openreplay/backend/pkg/storage"
	"openreplay/backend/pkg/token"
	"openreplay/backend/pkg/url/assets"
)

type ServicesBuilder struct {
	Database  *cache.PGCache
	Producer  types.Producer
	Assets    *assetscache.AssetsCache
	Flaker    *flakeid.Flaker
	UaParser  *uaparser.UAParser
	GeoIP     *geoip.GeoIP
	Tokenizer *token.Tokenizer
	Storage   *storage.S3
}

func New(cfg *config.Config, producer types.Producer, pgconn *cache.PGCache) *ServicesBuilder {
	rewriter := assets.NewRewriter(cfg.AssetsOrigin)
	return &ServicesBuilder{
		Database:  pgconn,
		Producer:  producer,
		Assets:    assetscache.New(cfg, rewriter, producer),
		Storage:   storage.NewS3(cfg.AWSRegion, cfg.S3BucketIOSImages),
		Tokenizer: token.NewTokenizer(cfg.TokenSecret),
		UaParser:  uaparser.NewUAParser(cfg.UAParserFile),
		GeoIP:     geoip.NewGeoIP(cfg.MaxMinDBFile),
		Flaker:    flakeid.NewFlaker(cfg.WorkerID),
	}
}
