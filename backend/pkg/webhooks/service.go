package webhooks

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"

	"openreplay/backend/pkg/db/postgres"
	"openreplay/backend/pkg/db/postgres/pool"
)

const webhookColumns = `webhooks.webhook_id, webhooks.endpoint, COALESCE(webhooks.auth_header, ''), webhooks.type::text,
		webhooks.index, COALESCE(webhooks.name, ''), (EXTRACT(EPOCH FROM webhooks.created_at) * 1000)::BIGINT`

type Webhooks interface {
	List(ctx context.Context, tenantID uint64) ([]*Webhook, error)
	Save(ctx context.Context, tenantID uint64, req *WebhookRequest) (*Webhook, error)
	Delete(ctx context.Context, tenantID uint64, webhookID int64) error
}

type webhooksImpl struct {
	pgconn pool.Pool
}

func New(pgconn pool.Pool) Webhooks {
	return &webhooksImpl{pgconn: pgconn}
}

func scanWebhook(row pgx.Row) (*Webhook, error) {
	w := &Webhook{}
	if err := row.Scan(&w.WebhookID, &w.Endpoint, &w.AuthHeader, &w.Type, &w.Index, &w.Name, &w.CreatedAt); err != nil {
		return nil, err
	}
	return w, nil
}

func (s *webhooksImpl) List(ctx context.Context, tenantID uint64) ([]*Webhook, error) {
	rows, err := s.pgconn.Query(`
		SELECT `+webhookColumns+`
		FROM public.webhooks
		WHERE webhooks.deleted_at IS NULL
		  AND `+tenantScope+`
		ORDER BY webhooks.webhook_id`,
		pgx.NamedArgs{"tenantId": tenantID})
	if err != nil {
		return nil, fmt.Errorf("list webhooks: %s", err)
	}
	defer rows.Close()

	list := make([]*Webhook, 0)
	for rows.Next() {
		w, err := scanWebhook(rows)
		if err != nil {
			return nil, fmt.Errorf("scan webhook: %s", err)
		}
		w.redact()
		list = append(list, w)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate webhooks: %s", err)
	}
	return list, nil
}

func (s *webhooksImpl) nameExists(tenantID uint64, name string, excludeID int64) (bool, error) {
	var exists bool
	err := s.pgconn.QueryRow(`
		SELECT EXISTS(SELECT 1
		              FROM public.webhooks
		              WHERE webhooks.deleted_at IS NULL
		                AND webhooks.type = 'webhook'
		                AND webhooks.name ILIKE @name ESCAPE '\'
		                AND webhooks.webhook_id != @webhookId
		                AND `+tenantScope+`)`,
		pgx.NamedArgs{"tenantId": tenantID, "webhookId": excludeID, "name": postgres.EscapeILIKE(name)}).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check webhook name: %s", err)
	}
	return exists, nil
}

func (s *webhooksImpl) Save(ctx context.Context, tenantID uint64, req *WebhookRequest) (*Webhook, error) {
	var excludeID int64
	if id := req.ID(); id != nil {
		excludeID = *id
	}
	exists, err := s.nameExists(tenantID, req.Name, excludeID)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, ErrNameExists
	}

	args := pgx.NamedArgs{"tenantId": tenantID, "endpoint": req.Endpoint, "authHeader": req.AuthHeader, "name": req.Name}
	if req.ID() == nil {
		w, err := scanWebhook(s.pgconn.QueryRow(insertWebhook+`
		RETURNING `+webhookColumns, args))
		if err != nil {
			return nil, fmt.Errorf("create webhook: %s", err)
		}
		return w, nil
	}

	args["webhookId"] = *req.ID()
	w, err := scanWebhook(s.pgconn.QueryRow(`
		UPDATE public.webhooks
		SET endpoint = @endpoint, auth_header = @authHeader, name = @name
		WHERE webhooks.webhook_id = @webhookId
		  AND webhooks.deleted_at IS NULL
		  AND webhooks.type = 'webhook'
		  AND `+tenantScope+`
		RETURNING `+webhookColumns, args))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrWebhookNotFound
		}
		return nil, fmt.Errorf("update webhook: %s", err)
	}
	return w, nil
}

func (s *webhooksImpl) Delete(ctx context.Context, tenantID uint64, webhookID int64) error {
	var deleted int64
	err := s.pgconn.QueryRow(`
		UPDATE public.webhooks
		SET deleted_at = (now() AT TIME ZONE 'utc')
		WHERE webhooks.webhook_id = @webhookId
		  AND webhooks.deleted_at IS NULL
		  AND webhooks.type = 'webhook'
		  AND `+tenantScope+`
		RETURNING webhooks.webhook_id`,
		pgx.NamedArgs{"tenantId": tenantID, "webhookId": webhookID}).Scan(&deleted)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrWebhookNotFound
		}
		return fmt.Errorf("delete webhook: %s", err)
	}
	return nil
}
