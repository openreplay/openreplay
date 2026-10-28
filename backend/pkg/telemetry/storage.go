package telemetry

import (
	"context"
	"fmt"

	"openreplay/backend/pkg/db/postgres/pool"
)

// Storage refreshes the tenant counters and returns the refreshed rows.
type Storage interface {
	Compute(ctx context.Context) ([]TenantStats, error)
}

type pgStorage struct {
	pg pool.Pool
}

func NewStorage(pg pool.Pool) Storage { return &pgStorage{pg: pg} }

// Compute runs computeSQL (edition-specific, see storage_tenant.go): one UPDATE that
// recounts integrations, projects, users and the sessions since the previous run, stamps
// last_telemetry, and returns one row per tenant.
func (s *pgStorage) Compute(ctx context.Context) ([]TenantStats, error) {
	rows, err := s.pg.Query(computeSQL)
	if err != nil {
		return nil, fmt.Errorf("update tenant counters: %w", err)
	}
	defer rows.Close()
	var out []TenantStats
	for rows.Next() {
		var t TenantStats
		if err := rows.Scan(&t.Name, &t.Integrations, &t.Projects, &t.Sessions, &t.Users, &t.TenantKey, &t.OptOut, &t.Version, &t.OwnerEmail); err != nil {
			return nil, fmt.Errorf("scan tenant counters: %w", err)
		}
		out = append(out, t)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate tenant counters: %w", err)
	}
	return out, nil
}
