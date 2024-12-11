package spot

import (
	"time"

	"openreplay/backend/internal/config/spot"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/flakeid"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/metrics/web"
	"openreplay/backend/pkg/objectstorage/store"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/server/auth"
	"openreplay/backend/pkg/server/keys"
	"openreplay/backend/pkg/server/limiter"
	"openreplay/backend/pkg/server/tracer"
	spotAPI "openreplay/backend/pkg/spot/api"
	"openreplay/backend/pkg/spot/service"
	"openreplay/backend/pkg/spot/transcoder"
)

type ServicesBuilder struct {
	Auth        auth.Auth
	RateLimiter *limiter.UserRateLimiter
	AuditTrail  tracer.Tracer
	SpotsAPI    api.Handlers
}

func NewServiceBuilder(log logger.Logger, cfg *spot.Config, webMetrics web.Web, pgconn pool.Pool) (*ServicesBuilder, error) {
	objStore, err := store.NewStore(&cfg.ObjectsConfig)
	if err != nil {
		return nil, err
	}
	flaker := flakeid.NewFlaker(cfg.WorkerID)
	spots := service.NewSpots(log, pgconn, flaker)
	transcoder := transcoder.NewTranscoder(cfg, log, objStore, pgconn, spots)
	keys := keys.NewKeys(log, pgconn)
	auditrail, err := tracer.NewTracer(log, pgconn)
	if err != nil {
		return nil, err
	}
	responser := api.NewResponser(webMetrics)
	handlers, err := spotAPI.NewHandlers(log, cfg, responser, spots, objStore, transcoder, keys)
	if err != nil {
		return nil, err
	}
	return &ServicesBuilder{
		Auth:        auth.NewAuth(log, cfg.JWTSecret, cfg.JWTSpotSecret, pgconn, keys),
		RateLimiter: limiter.NewUserRateLimiter(10, 30, 1*time.Minute, 5*time.Minute),
		AuditTrail:  auditrail,
		SpotsAPI:    handlers,
	}, nil
}
