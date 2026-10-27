package webhooks

const (
	tenantScope   = `webhooks.tenant_id = @tenantId`
	insertWebhook = `
		INSERT INTO public.webhooks (tenant_id, endpoint, auth_header, type, name)
		VALUES (@tenantId, @endpoint, @authHeader, 'webhook', @name)`
)
