package frames

import (
	"openreplay/backend/pkg/cleanup/registry"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/db/redis"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/metrics/database"
	"openreplay/backend/pkg/metrics/web"
	"openreplay/backend/pkg/projects"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/sessions"
	"openreplay/backend/pkg/token"
)

type serviceBuilder struct {
	handlers []api.Handlers
}

func (b *serviceBuilder) Handlers() []api.Handlers {
	return b.handlers
}

func NewServiceBuilder(handlers ...api.Handlers) api.ServiceBuilder {
	return &serviceBuilder{handlers: handlers}
}

type APIDeps struct {
	Sessions   sessions.Sessions
	Tokenizer  *token.Tokenizer
	Responser  api.Responser
	CleanupReg registry.Registry
}

func NewAPIDeps(log logger.Logger, tokenSecret string, webMetrics web.Web, dbMetrics database.Database, pgconn pool.Pool, redis *redis.Client) APIDeps {
	projs := projects.New(log, pgconn, redis, dbMetrics)
	sess := sessions.New(log, pgconn, projs, redis, dbMetrics, sessions.DoNotIgnoreInactiveProjects)
	return APIDeps{
		Sessions:   sess,
		Tokenizer:  token.NewTokenizer(tokenSecret),
		Responser:  api.NewResponser(webMetrics),
		CleanupReg: registry.New(log, redis),
	}
}
