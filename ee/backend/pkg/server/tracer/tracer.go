package tracer

import (
	"context"
	"errors"
	"net/http"
	"openreplay/backend/pkg/metrics/database"

	"openreplay/backend/pkg/db/postgres"
	db "openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/pool"
	"openreplay/backend/pkg/server/user"
)

type Tracer interface {
	Middleware(next http.Handler) http.Handler
	Close() error
}

type tracerImpl struct {
	log     logger.Logger
	conn    db.Pool
	traces  postgres.Bulk
	saver   pool.WorkerPool
	metrics database.Database
}

func NewTracer(log logger.Logger, conn db.Pool, metrics database.Database) (Tracer, error) {
	switch {
	case log == nil:
		return nil, errors.New("logger is required")
	case conn == nil:
		return nil, errors.New("connection is required")
	}
	tracer := &tracerImpl{
		log:     log,
		conn:    conn,
		metrics: metrics,
	}
	if err := tracer.initBulk(); err != nil {
		return nil, err
	}
	tracer.saver = pool.NewPool(1, 200, tracer.sendTraces)
	return tracer, nil
}

func (t *tracerImpl) initBulk() (err error) {
	t.traces, err = postgres.NewBulk(t.conn, t.metrics,
		"traces",
		"(user_id, tenant_id, auth, action, method, path_format, endpoint, payload, parameters, status)",
		"($%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d)",
		10, 50)
	if err != nil {
		return err
	}
	return nil
}

type Task struct {
	UserID   *uint64
	TenantID uint64
	Auth     *string
	Data     *RequestData
}

func (t *tracerImpl) sendTraces(payload interface{}) {
	rec := payload.(*Task)
	t.log.Debug(context.Background(), "Sending traces, %v", rec)
	if err := t.traces.Append(rec.UserID, rec.TenantID, rec.Auth, rec.Data.Action, rec.Data.Method, rec.Data.PathFormat,
		rec.Data.Endpoint, rec.Data.Payload, rec.Data.Parameters, rec.Data.Status); err != nil {
		t.log.Error(context.Background(), "can't append trace: %s", err)
	}
}

type RequestData struct {
	Action     string
	Method     string
	PathFormat string
	Endpoint   string
	Payload    []byte
	Parameters []byte
	Status     int
}

func (t *tracerImpl) trace(user *user.User, data *RequestData) error {
	switch {
	case user == nil:
		return errors.New("user is required")
	case data == nil:
		return errors.New("request is required")
	}
	trace := &Task{
		UserID:   &user.ID,
		TenantID: user.TenantID,
		Auth:     &user.AuthMethod,
		Data:     data,
	}
	t.saver.Submit(trace)
	return nil
}

func (t *tracerImpl) Close() error {
	t.saver.Stop()
	if err := t.traces.Send(); err != nil {
		return err
	}
	return nil
}
