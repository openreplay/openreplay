package admin

const (
	tenantScope   = `TRUE`
	insertProject = `
		INSERT INTO public.projects (name, platform, active)
		VALUES (@name, @platform, TRUE)
		RETURNING project_id`
)
