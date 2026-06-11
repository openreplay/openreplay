package images

import (
	"openreplay/backend/internal/config/images"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/db/redis"
	imageAPI "openreplay/backend/pkg/images/api"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/metrics/database"
	"openreplay/backend/pkg/metrics/web"
	"openreplay/backend/pkg/projects"
	"openreplay/backend/pkg/queue/types"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/sessions"
	"openreplay/backend/pkg/token"
)

type serviceBuilder struct {
	api api.Handlers
}

func (b *serviceBuilder) Handlers() []api.Handlers {
	return []api.Handlers{b.api}
}

func NewServiceBuilder(log logger.Logger, cfg *images.Config, webMetrics web.Web, dbMetrics database.Database, producer types.Producer, pgconn pool.Pool, redis *redis.Client) (api.ServiceBuilder, error) {
	builder := &serviceBuilder{}
	var err error

	projs := projects.New(log, pgconn, redis, dbMetrics)
	sessions := sessions.New(log, pgconn, projs, redis, dbMetrics, sessions.DoNotIgnoreInactiveProjects)
	tokenizer := token.NewTokenizer(cfg.TokenSecret)
	responser := api.NewResponser(webMetrics)
	if builder.api, err = imageAPI.NewHandlers(cfg, log, responser, tokenizer, sessions, producer); err != nil {
		return nil, err
	}
	return builder, nil
}
