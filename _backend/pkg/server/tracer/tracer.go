package tracer

import (
	"net/http"

	db "openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/metrics/database"
	"openreplay/backend/pkg/server/api"
)

type Tracer interface {
	Middleware(next http.Handler) http.Handler
	Close() error
}

type tracerImpl struct{}

func NewTracer(log logger.Logger, conn db.Pool, metrics database.Database, handlers []api.Handlers) (Tracer, error) {
	return &tracerImpl{}, nil
}

func (t *tracerImpl) Close() error {
	return nil
}
