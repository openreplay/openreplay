package tenant

import (
	"fmt"
	"openreplay/backend/pkg/db/postgres/pool"
)

func getTenantByApiKey(conn pool.Pool, apiKey string) (*Tenant, error) {
	sql := fmt.Sprintf(`
		SELECT tenant_id, api_key
	   	FROM public.tenants
	   	WHERE api_key = $1
	   	LIMIT 1;`)

	tenant := &Tenant{AuthMethod: "jwt"}
	if err := conn.QueryRow(sql, apiKey).Scan(&tenant.TenantID, &tenant.ApiKey); err != nil {
		return nil, fmt.Errorf("tenant not found")
	}
	return tenant, nil
}
