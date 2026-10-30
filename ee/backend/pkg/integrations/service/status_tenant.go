package service

const projectTenantFilter = " AND p.tenant_id = @tenantId"

const webhookTenantFilter = " AND tenant_id = @tenantId"
