package services

import (
	"openreplay/backend/internal/config/http"
	"openreplay/backend/internal/http/geoip"
	"openreplay/backend/internal/http/uaparser"
	"openreplay/backend/pkg/conditions"
	conditionsAPI "openreplay/backend/pkg/conditions/api"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/db/redis"
	"openreplay/backend/pkg/flakeid"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/metrics/database"
	"openreplay/backend/pkg/metrics/web"
	"openreplay/backend/pkg/projects"
	"openreplay/backend/pkg/queue/types"
	sdkAPI "openreplay/backend/pkg/sdk/api"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/sessions"
	mobilesessions "openreplay/backend/pkg/sessions/api/mobile"
	websessions "openreplay/backend/pkg/sessions/api/web"
	"openreplay/backend/pkg/tags"
	tagsAPI "openreplay/backend/pkg/tags/api"
	"openreplay/backend/pkg/token"
)

type serviceBuilder struct {
	webAPI        api.Handlers
	mobileAPI     api.Handlers
	conditionsAPI api.Handlers
	tagsAPI       api.Handlers
	sdkAPI        api.Handlers
}

func (b *serviceBuilder) Handlers() []api.Handlers {
	return []api.Handlers{b.webAPI, b.mobileAPI, b.conditionsAPI, b.tagsAPI}
}

func New(log logger.Logger, cfg *http.Config, webMetrics web.Web, dbMetrics database.Database, producer types.Producer, pgconn pool.Pool, redis *redis.Client) (api.ServiceBuilder, error) {
	projs := projects.New(log, pgconn, redis, dbMetrics)
	geoModule, err := geoip.New(log, cfg.MaxMinDBFile)
	if err != nil {
		return nil, err
	}
	uaModule, err := uaparser.NewUAParser(cfg.UAParserFile)
	if err != nil {
		return nil, err
	}
	tokenizer := token.NewTokenizer(cfg.TokenSecret)
	conditions := conditions.New(pgconn)
	flaker := flakeid.NewFlaker(cfg.WorkerID)
	sessions := sessions.New(log, pgconn, projs, redis, dbMetrics)
	tags := tags.New(log, pgconn)
	responser := api.NewResponser(webMetrics)
	builder := &serviceBuilder{}
	if builder.webAPI, err = websessions.NewHandlers(cfg, log, responser, producer, projs, sessions, uaModule, geoModule, tokenizer, conditions, flaker); err != nil {
		return nil, err
	}
	if builder.mobileAPI, err = mobilesessions.NewHandlers(cfg, log, responser, producer, projs, sessions, uaModule, geoModule, tokenizer, conditions, flaker); err != nil {
		return nil, err
	}
	if builder.conditionsAPI, err = conditionsAPI.NewHandlers(log, responser, tokenizer, conditions); err != nil {
		return nil, err
	}
	if builder.tagsAPI, err = tagsAPI.NewHandlers(log, responser, tokenizer, sessions, tags); err != nil {
		return nil, err
	}
	if builder.sdkAPI, err = sdkAPI.NewHandlers(cfg, log, responser, producer, projs, sessions, geoModule, tokenizer, flaker); err != nil {
		return nil, err
	}
	return builder, nil
}
