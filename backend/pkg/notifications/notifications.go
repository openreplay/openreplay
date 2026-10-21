package notifications

import (
	"context"
	"fmt"
	"math"
	"time"

	"github.com/jackc/pgx/v5"

	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
)

type Notifications interface {
	GetAll(ctx context.Context, tenantID, userID uint64) ([]*Notification, error)
	Count(ctx context.Context, tenantID, userID uint64) (*Count, error)
	View(ctx context.Context, tenantID, userID uint64, req *ViewRequest) (bool, error)
}

type notificationsImpl struct {
	log    logger.Logger
	pgconn pool.Pool
}

func New(log logger.Logger, pgconn pool.Pool) Notifications {
	return &notificationsImpl{
		log:    log,
		pgconn: pgconn,
	}
}

func audienceArgs(tenantID, userID uint64) pgx.NamedArgs {
	return pgx.NamedArgs{"tenantId": tenantID, "userId": userID}
}

func (s *notificationsImpl) GetAll(ctx context.Context, tenantID, userID uint64) ([]*Notification, error) {
	rows, err := s.pgconn.Query(`
		SELECT notifications.notification_id, notifications.user_id, notifications.title, notifications.description,
		       notifications.button_text, notifications.button_url, notifications.image_url,
		       notifications.created_at, notifications.options,
		       user_viewed_notifications.notification_id IS NOT NULL AS viewed
		FROM public.notifications
		     LEFT JOIN public.user_viewed_notifications
		               ON user_viewed_notifications.notification_id = notifications.notification_id
		                   AND user_viewed_notifications.user_id = @userId
		WHERE `+audienceFilter+`
		ORDER BY notifications.created_at DESC
		LIMIT 100`, audienceArgs(tenantID, userID))
	if err != nil {
		return nil, fmt.Errorf("list notifications: %s", err)
	}
	defer rows.Close()

	list := make([]*Notification, 0)
	for rows.Next() {
		n := &Notification{}
		var createdAt time.Time
		if err := rows.Scan(&n.NotificationID, &n.UserID, &n.Title, &n.Description,
			&n.ButtonText, &n.ButtonURL, &n.ImageURL, &createdAt, &n.Options, &n.Viewed); err != nil {
			return nil, fmt.Errorf("scan notification: %s", err)
		}
		n.CreatedAt = createdAt.UnixMilli()
		list = append(list, n)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate notifications: %s", err)
	}
	return list, nil
}

func (s *notificationsImpl) Count(ctx context.Context, tenantID, userID uint64) (*Count, error) {
	c := &Count{}
	err := s.pgconn.QueryRow(`
		SELECT COUNT(*)
		FROM public.notifications
		WHERE `+audienceFilter+`
		  AND NOT EXISTS(SELECT 1
		                 FROM public.user_viewed_notifications
		                 WHERE user_viewed_notifications.notification_id = notifications.notification_id
		                   AND user_viewed_notifications.user_id = @userId)`,
		audienceArgs(tenantID, userID)).Scan(&c.Count)
	if err != nil {
		return nil, fmt.Errorf("count notifications: %s", err)
	}
	return c, nil
}

func (s *notificationsImpl) View(ctx context.Context, tenantID, userID uint64, req *ViewRequest) (bool, error) {
	if len(req.IDs) == 0 && req.EndTimestamp == nil {
		return false, nil
	}
	args := audienceArgs(tenantID, userID)
	var condition string
	if len(req.IDs) > 0 {
		condition = `notifications.notification_id = ANY(@ids)`
		args["ids"] = req.IDs
	} else {
		var start int64
		if req.StartTimestamp != nil {
			start = *req.StartTimestamp
		}
		condition = `CAST(EXTRACT(EPOCH FROM notifications.created_at) * 1000 AS BIGINT) BETWEEN @start AND @end`
		end := int64(math.MaxInt64)
		if *req.EndTimestamp <= math.MaxInt64-1000 {
			end = *req.EndTimestamp + 1000
		}
		args["start"] = start
		args["end"] = end
	}
	err := s.pgconn.ExecContext(ctx, `
		INSERT INTO public.user_viewed_notifications (user_id, notification_id)
		SELECT @userId::integer, notifications.notification_id
		FROM public.notifications
		WHERE `+audienceFilter+`
		  AND `+condition+`
		ON CONFLICT DO NOTHING`, args)
	if err != nil {
		return false, fmt.Errorf("view notifications: %s", err)
	}
	return true, nil
}
