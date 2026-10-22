package alerts

import (
	"fmt"

	"github.com/jackc/pgx/v5"
)

// CE variant: there is no tenant. The EE overlay replaces this file.

const tenantSelectExpr = "-1"

const webhookTenantFilter = ""

const notificationColumns = "user_id, title, description, button_text, button_url, image_url, options"

func notificationRow(i int, _ Notification, _ pgx.NamedArgs) string {
	return fmt.Sprintf("(NULL, @title%d, @description%d, @buttonText%d, @buttonUrl%d, NULL, @options%d::jsonb)", i, i, i, i, i)
}
