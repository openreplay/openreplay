package alerts

import (
	"strings"
	"testing"

	"github.com/jackc/pgx/v5"
)

func TestTenantSQL(t *testing.T) {
	if !strings.Contains(activeAlertsSQL, "projects.tenant_id") {
		t.Error("active alerts query must select projects.tenant_id")
	}
	if !strings.Contains(webhookTenantFilter, "tenant_id = @tenantId") {
		t.Error("webhooks must be filtered by tenant")
	}
	if !strings.HasPrefix(notificationColumns, "tenant_id,") {
		t.Error("notifications insert must set tenant_id")
	}
	args := pgx.NamedArgs{}
	row := notificationRow(2, Notification{TenantID: 7}, args)
	if !strings.HasPrefix(row, "(@tenantId2, NULL,") {
		t.Errorf("unexpected row: %s", row)
	}
	if args["tenantId2"] != int64(7) {
		t.Errorf("tenant arg not bound: %v", args)
	}
}
