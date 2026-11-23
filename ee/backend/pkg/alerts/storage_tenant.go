package alerts

import (
	"fmt"

	"github.com/jackc/pgx/v5"
)

// EE variant: alerts, notifications and webhooks are scoped to a tenant.

const tenantSelectExpr = "projects.tenant_id"

const webhookTenantFilter = " AND tenant_id = @tenantId"

const notificationColumns = "tenant_id, user_id, title, description, button_text, button_url, image_url, options"

func notificationRow(i int, n Notification, args pgx.NamedArgs) string {
	args[fmt.Sprintf("tenantId%d", i)] = n.TenantID
	return fmt.Sprintf("(@tenantId%d, NULL, @title%d, @description%d, @buttonText%d, @buttonUrl%d, NULL, @options%d::jsonb)", i, i, i, i, i, i)
}
