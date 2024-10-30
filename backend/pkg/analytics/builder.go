package analytics

import (
	"openreplay/backend/internal/config/analytics"
	"openreplay/backend/pkg/common"
	"openreplay/backend/pkg/logger"
)

type ServiceBuilder struct {
	*common.ServicesBuilder
}

func NewServiceBuilder(log logger.Logger, cfg *analytics.Config) *ServiceBuilder {
	builder := common.NewServiceBuilder(log).
		WithDatabase(cfg.Postgres.String()).
		WithJWTSecret(cfg.JWTSecret, cfg.JWTSpotSecret).
		WithObjectStorage(&cfg.ObjectsConfig)

	return &ServiceBuilder{
		ServicesBuilder: builder,
	}
}
