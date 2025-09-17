package tenant

import (
	"fmt"
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
	sql := fmt.Sprintf(`
		SELECT tenant_id, api_key
	   	FROM public.tenants
	   	WHERE api_key = $1
	   	LIMIT 1;`)

	tenant := &Tenant{AuthMethod: "jwt"}
	if err := u.conn.QueryRow(sql, apiKey).Scan(&tenant.TenantID, &tenant.ApiKey); err != nil {
		return nil, fmt.Errorf("tenant not found")
	}
	return tenant, nil
}
