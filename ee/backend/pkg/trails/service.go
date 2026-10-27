package trails

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"

	"openreplay/backend/pkg/db/postgres"
	"openreplay/backend/pkg/db/postgres/pool"
)

type Trails interface {
	Search(ctx context.Context, tenantID uint64, p *searchParams) (*SearchResponse, error)
	Actions(ctx context.Context, tenantID uint64) ([]string, error)
}

type trailsImpl struct {
	pgconn pool.Pool
}

func New(pgconn pool.Pool) Trails {
	return &trailsImpl{pgconn: pgconn}
}

func filters(tenantID uint64, p *searchParams) (string, pgx.NamedArgs) {
	conditions := []string{
		"traces.tenant_id = @tenantId",
		"traces.created_at >= @startDate",
		"traces.created_at <= @endDate",
	}
	args := pgx.NamedArgs{"tenantId": tenantID, "startDate": p.startDate, "endDate": p.endDate}
	if p.userID != nil {
		conditions = append(conditions, "traces.user_id = @userId")
		args["userId"] = *p.userID
	}
	if p.action != "" {
		conditions = append(conditions, "traces.action = @action")
		args["action"] = p.action
	}
	if p.query != "" {
		conditions = append(conditions, `(users.name ILIKE @query ESCAPE '\' OR replace(traces.action, '_', ' ') ILIKE @query ESCAPE '\')`)
		args["query"] = "%" + postgres.EscapeILIKE(p.query) + "%"
	}
	return strings.Join(conditions, " AND "), args
}

func (s *trailsImpl) Search(ctx context.Context, tenantID uint64, p *searchParams) (*SearchResponse, error) {
	where, args := filters(tenantID, p)
	args["limit"] = p.limit
	args["offset"] = p.offset
	rows, err := s.pgconn.Query(`
		SELECT traces.user_id, traces.tenant_id, traces.created_at, traces.auth, traces.action, traces.method,
		       traces.path_format, traces.endpoint, traces.payload, traces.parameters, traces.status,
		       users.email, users.name, COUNT(*) OVER ()
		FROM public.traces
		         LEFT JOIN public.users ON users.user_id = traces.user_id
		WHERE `+where+`
		ORDER BY traces.created_at `+p.order+`
		LIMIT @limit OFFSET @offset`, args)
	if err != nil {
		return nil, fmt.Errorf("search trails: %s", err)
	}
	defer rows.Close()

	res := &SearchResponse{Sessions: make([]*Trail, 0)}
	for rows.Next() {
		t := &Trail{}
		if err := rows.Scan(&t.UserID, &t.TenantID, &t.CreatedAt, &t.Auth, &t.Action, &t.Method, &t.PathFormat,
			&t.Endpoint, &t.Payload, &t.Parameters, &t.Status, &t.Email, &t.Username, &res.Count); err != nil {
			return nil, fmt.Errorf("scan trail: %s", err)
		}
		t.Rn = int64(p.offset + len(res.Sessions) + 1)
		res.Sessions = append(res.Sessions, t)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate trails: %s", err)
	}

	if len(res.Sessions) == 0 && p.offset > 0 {
		if err := s.pgconn.QueryRow(`
			SELECT COUNT(*)
			FROM public.traces
			         LEFT JOIN public.users ON users.user_id = traces.user_id
			WHERE `+where, args).Scan(&res.Count); err != nil {
			return nil, fmt.Errorf("count trails: %s", err)
		}
	}
	return res, nil
}

func (s *trailsImpl) Actions(ctx context.Context, tenantID uint64) ([]string, error) {
	rows, err := s.pgconn.Query(`
		SELECT DISTINCT traces.action
		FROM public.traces
		WHERE traces.tenant_id = @tenantId
		ORDER BY 1`, pgx.NamedArgs{"tenantId": tenantID})
	if err != nil {
		return nil, fmt.Errorf("list trail actions: %s", err)
	}
	defer rows.Close()

	actions := make([]string, 0)
	for rows.Next() {
		var action string
		if err := rows.Scan(&action); err != nil {
			return nil, fmt.Errorf("scan trail action: %s", err)
		}
		actions = append(actions, action)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate trail actions: %s", err)
	}
	return actions, nil
}
