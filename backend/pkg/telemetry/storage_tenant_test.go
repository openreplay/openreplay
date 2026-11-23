package telemetry

import (
	"strings"
	"testing"
)

func TestCommunityEdition(t *testing.T) {
	if edition != "foss" {
		t.Errorf("edition: %s", edition)
	}
	if strings.Contains(computeSQL, "tenant_id") {
		t.Error("CE statement must not scope by tenant")
	}
}
