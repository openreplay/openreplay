package admin

const (
	tenantScope   = `projects.tenant_id = @tenantId`
	insertProject = `
		INSERT INTO public.projects (tenant_id, name, platform, active)
		VALUES (@tenantId, @name, @platform, TRUE)
		RETURNING project_id`
)
