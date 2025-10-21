package keys

var getUserSQL = `SELECT tenant_id, name, email FROM public.users WHERE user_id = $1 AND deleted_at IS NULL LIMIT 1`
