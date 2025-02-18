package charts

import "openreplay/backend/pkg/analytics/db"

type FunnelQueryBuilder struct{}

func (f FunnelQueryBuilder) Execute(p Payload, conn db.Connector) (interface{}, error) {
	return "-- Funnel query placeholder", nil
}
