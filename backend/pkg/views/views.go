package views

import (
	"context"
	"fmt"

	"github.com/ClickHouse/clickhouse-go/v2"

	"openreplay/backend/pkg/db/postgres/pool"
)

type Views interface {
	AddSessionView(ctx context.Context, projID uint32, sessID uint64, userID string) error
}

type viewsImpl struct {
	pgPool pool.Pool
	chConn clickhouse.Conn
}

func New(pgPool pool.Pool, ch clickhouse.Conn) (Views, error) {
	return &viewsImpl{
		pgPool: pgPool,
		chConn: ch,
	}, nil
}

func (v *viewsImpl) AddSessionView(ctx context.Context, projID uint32, sessID uint64, userID string) error {
	if err := v.addToPostgres(ctx, sessID, userID); err != nil {
		return fmt.Errorf("failed to add session view to PG: %s", err)
	}
	if err := v.addToClickHouse(ctx, projID, sessID, userID); err != nil {
		return fmt.Errorf("failed to add session view to ClickHouse: %s", err)
	}
	return nil
}

func (v *viewsImpl) addToPostgres(ctx context.Context, sessID uint64, userID string) error {
	query := `INSERT INTO public.user_viewed_sessions(session_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;`
	return v.pgPool.Exec(query, sessID, userID)
}

func (v *viewsImpl) addToClickHouse(ctx context.Context, projID uint32, sessID uint64, userID string) error {
	query := `INSERT INTO experimental.user_viewed_sessions(project_id, session_id, user_id) VALUES (?, ?, ?);`
	return v.chConn.Exec(ctx, query, projID, sessID, userID)
}
