package tracer

import (
	"net/http"

	db "openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
)

type Tracer interface {
	Middleware(next http.Handler) http.Handler
	Close() error
}

type tracerImpl struct{}

func NewTracer(log logger.Logger, conn db.Pool) (Tracer, error) {
	return &tracerImpl{}, nil
}

func (t *tracerImpl) Close() error {
	return nil
}
