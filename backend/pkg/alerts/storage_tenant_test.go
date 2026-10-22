package alerts

import (
	"strings"
	"testing"

	"github.com/jackc/pgx/v5"
)

func TestCETenantSQL(t *testing.T) {
	if !strings.Contains(activeAlertsSQL, "SELECT -1") {
		t.Error("CE active alerts query must select -1 as tenant_id")
	}
	if webhookTenantFilter != "" {
		t.Error("CE webhooks must not be filtered by tenant")
	}
	if strings.Contains(notificationColumns, "tenant_id") {
		t.Error("CE notifications insert must not reference tenant_id")
	}
	args := pgx.NamedArgs{}
	row := notificationRow(0, Notification{}, args)
	if row != "(NULL, @title0, @description0, @buttonText0, @buttonUrl0, NULL, @options0::jsonb)" {
		t.Errorf("unexpected row: %s", row)
	}
}
