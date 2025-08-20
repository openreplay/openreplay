package integrations

import (
	"openreplay/backend/internal/config/integrations"
	"openreplay/backend/pkg/db/postgres/pool"
	integrationsAPI "openreplay/backend/pkg/integrations/api"
	"openreplay/backend/pkg/integrations/service"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/metrics/web"
	"openreplay/backend/pkg/objectstorage/store"
	"openreplay/backend/pkg/server/api"
)

type serviceBuilder struct {
	integrationsAPI api.Handlers
}

func (b *serviceBuilder) Handlers() []api.Handlers {
	return []api.Handlers{b.integrationsAPI}
}

func NewServiceBuilder(log logger.Logger, cfg *integrations.Config, webMetrics web.Web, pgconn pool.Pool) (api.ServiceBuilder, error) {
	objStore, err := store.NewStore(&cfg.ObjectsConfig)
	if err != nil {
		return nil, err
	}
	integrator, err := service.NewService(log, pgconn, objStore)
	if err != nil {
		return nil, err
	}
	responser := api.NewResponser(webMetrics)
	handlers, err := integrationsAPI.NewHandlers(log, cfg, responser, integrator)
	if err != nil {
		return nil, err
	}
	builder := &serviceBuilder{
		integrationsAPI: handlers,
	}
	return builder, nil
}
