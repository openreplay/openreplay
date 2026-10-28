package telemetry

import (
	"strings"
	"testing"
)

func TestEnterpriseEdition(t *testing.T) {
	if edition != "ee" {
		t.Errorf("edition: %s", edition)
	}
	for _, p := range []string{"all_tenants.tenant_id", "WHERE tenants.tenant_id = all_tenants.tenant_id", "users.tenant_id = tenants.tenant_id"} {
		if !strings.Contains(computeSQL, p) {
			t.Errorf("EE statement missing %q", p)
		}
	}
}
