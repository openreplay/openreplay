package webhooks

const (
	tenantScope   = `TRUE`
	insertWebhook = `
		INSERT INTO public.webhooks (endpoint, auth_header, type, name)
		VALUES (@endpoint, @authHeader, 'webhook', @name)`
)
