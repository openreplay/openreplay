package keys

var getUserSQL = `SELECT 1, name, email FROM public.users WHERE user_id = $1 AND deleted_at IS NULL LIMIT 1`
