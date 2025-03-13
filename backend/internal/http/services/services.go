package services

import (
	"openreplay/backend/internal/config/http"
	"openreplay/backend/internal/http/geoip"
	"openreplay/backend/internal/http/uaparser"
	"openreplay/backend/pkg/conditions"
	conditionsAPI "openreplay/backend/pkg/conditions/api"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/db/redis"
	"openreplay/backend/pkg/featureflags"
	featureflagsAPI "openreplay/backend/pkg/featureflags/api"
	"openreplay/backend/pkg/flakeid"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/metrics/database"
	"openreplay/backend/pkg/metrics/web"
	"openreplay/backend/pkg/objectstorage/store"
	"openreplay/backend/pkg/projects"
	"openreplay/backend/pkg/queue/types"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/sessions"
	mobilesessions "openreplay/backend/pkg/sessions/api/mobile"
	websessions "openreplay/backend/pkg/sessions/api/web"
	"openreplay/backend/pkg/tags"
	tagsAPI "openreplay/backend/pkg/tags/api"
	"openreplay/backend/pkg/token"
	"openreplay/backend/pkg/uxtesting"
	uxtestingAPI "openreplay/backend/pkg/uxtesting/api"
)

type ServicesBuilder struct {
	WebAPI          api.Handlers
	MobileAPI       api.Handlers
	ConditionsAPI   api.Handlers
	FeatureFlagsAPI api.Handlers
	TagsAPI         api.Handlers
	UxTestsAPI      api.Handlers
}

func New(log logger.Logger, cfg *http.Config, webMetrics web.Web, dbMetrics database.Database, producer types.Producer, pgconn pool.Pool, redis *redis.Client) (*ServicesBuilder, error) {
	projs := projects.New(log, pgconn, redis, dbMetrics)
	objStore, err := store.NewStore(&cfg.ObjectsConfig)
	if err != nil {
		return nil, err
	}
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
	featureFlags := featureflags.New(pgconn)
	tags := tags.New(log, pgconn)
	uxTesting := uxtesting.New(pgconn)
	responser := api.NewResponser(webMetrics)
	builder := &ServicesBuilder{}
	if builder.WebAPI, err = websessions.NewHandlers(cfg, log, responser, producer, projs, sessions, uaModule, geoModule, tokenizer, conditions, flaker); err != nil {
		return nil, err
	}
	if builder.MobileAPI, err = mobilesessions.NewHandlers(cfg, log, responser, producer, projs, sessions, uaModule, geoModule, tokenizer, conditions, flaker); err != nil {
		return nil, err
	}
	if builder.ConditionsAPI, err = conditionsAPI.NewHandlers(log, responser, tokenizer, conditions); err != nil {
		return nil, err
	}
	if builder.FeatureFlagsAPI, err = featureflagsAPI.NewHandlers(log, responser, cfg.JsonSizeLimit, tokenizer, sessions, featureFlags); err != nil {
		return nil, err
	}
	if builder.TagsAPI, err = tagsAPI.NewHandlers(log, responser, tokenizer, sessions, tags); err != nil {
		return nil, err
	}
	if builder.UxTestsAPI, err = uxtestingAPI.NewHandlers(log, responser, cfg.JsonSizeLimit, tokenizer, sessions, uxTesting, objStore); err != nil {
		return nil, err
	}
	return builder, nil
}
