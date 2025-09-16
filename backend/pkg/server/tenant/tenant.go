package tenant

import (
	"openreplay/backend/pkg/db/postgres/pool"
)

type Tenant struct {
	TenantID   int    `json:"tenantId"`
	ApiKey     string `json:"apiKey"`
	AuthMethod string
}

type Tenants interface {
	GetTenantByApiKey(apiKey string) (*Tenant, error)
}

type tenantsImpl struct {
	conn pool.Pool
}

func New(pgconn pool.Pool) Tenants {
	return &tenantsImpl{conn: pgconn}
}

func (u *tenantsImpl) GetTenantByApiKey(apiKey string) (*Tenant, error) {
	return getTenantByApiKey(u.conn, apiKey)
}
