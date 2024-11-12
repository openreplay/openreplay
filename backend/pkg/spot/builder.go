package spot

import (
	"openreplay/backend/internal/config/spot"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/flakeid"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/objectstorage"
	"openreplay/backend/pkg/objectstorage/store"
	"openreplay/backend/pkg/server/auth"
	"openreplay/backend/pkg/server/keys"
	"openreplay/backend/pkg/server/limiter"
	"openreplay/backend/pkg/spot/service"
	"openreplay/backend/pkg/spot/transcoder"
	"time"
)

type ServicesBuilder struct {
	Flaker      *flakeid.Flaker
	ObjStorage  objectstorage.ObjectStorage
	Transcoder  transcoder.Transcoder
	Spots       service.Spots
	Keys        keys.Keys
	Auth        auth.Auth
	RateLimiter *limiter.UserRateLimiter
}

func NewServiceBuilder(log logger.Logger, cfg *spot.Config, pgconn pool.Pool) (*ServicesBuilder, error) {
	objStore, err := store.NewStore(&cfg.ObjectsConfig)
	if err != nil {
		return nil, err
	}
	flaker := flakeid.NewFlaker(cfg.WorkerID)
	spots := service.NewSpots(log, pgconn, flaker)
	keys := keys.NewKeys(log, pgconn)
	return &ServicesBuilder{
		Flaker:      flaker,
		ObjStorage:  objStore,
		Transcoder:  transcoder.NewTranscoder(cfg, log, objStore, pgconn, spots),
		Spots:       spots,
		Keys:        keys,
		Auth:        auth.NewAuth(log, cfg.JWTSecret, cfg.JWTSpotSecret, pgconn, keys),
		RateLimiter: limiter.NewUserRateLimiter(10, 30, 1*time.Minute, 5*time.Minute),
	}, nil
}
