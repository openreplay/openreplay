package canvases

import (
	"openreplay/backend/internal/config/canvases"
	canvasAPI "openreplay/backend/pkg/canvases/api"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/db/redis"
	"openreplay/backend/pkg/frames"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/metrics/database"
	"openreplay/backend/pkg/metrics/web"
	"openreplay/backend/pkg/queue/types"
	"openreplay/backend/pkg/server/api"
)

func NewServiceBuilder(log logger.Logger, cfg *canvases.Config, webMetrics web.Web, dbMetrics database.Database, producer types.Producer, pgconn pool.Pool, redis *redis.Client) (api.ServiceBuilder, error) {
	deps := frames.NewAPIDeps(log, cfg.TokenSecret, webMetrics, dbMetrics, pgconn, redis)
	handlers, err := canvasAPI.NewHandlers(cfg, log, deps.Responser, deps.Tokenizer, deps.Sessions, producer, deps.CleanupReg)
	if err != nil {
		return nil, err
	}
	return frames.NewServiceBuilder(handlers), nil
}
