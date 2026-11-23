package service

import (
	"fmt"

	"github.com/jackc/pgx/v5"
)

const (
	ScopeUser    = "user"
	ScopeTenant  = "tenant"
	ScopeProject = "project"
)

type Status struct {
	Scope      string   `json:"scope"`
	Integrated bool     `json:"integrated"`
	ProjectIDs []uint32 `json:"projectIds,omitzero"`
}

var accountStatusSQL = `
SELECT EXISTS(SELECT 1 FROM public.oauth_authentication WHERE user_id = @userId AND provider::text = 'github') AS github,
       EXISTS(SELECT 1 FROM public.oauth_authentication WHERE user_id = @userId AND provider::text = 'linear') AS linear,
       EXISTS(SELECT 1 FROM public.jira_cloud WHERE user_id = @userId)                                        AS jira,
       EXISTS(SELECT 1
              FROM public.webhooks
              WHERE type = 'slack' AND deleted_at IS NULL` + webhookTenantFilter + `)                         AS slack,
       EXISTS(SELECT 1
              FROM public.webhooks
              WHERE type = 'msteams' AND deleted_at IS NULL` + webhookTenantFilter + `)                       AS msteams`

var projectStatusSQL = `
SELECT i.provider::text AS provider, i.project_id
FROM public.integrations AS i
     INNER JOIN public.projects AS p USING (project_id)
WHERE p.deleted_at IS NULL
  AND i.provider::text = ANY (@providers)` + projectTenantFilter + `
ORDER BY i.project_id`

func (s *serviceImpl) GetStatus(tenantID, userID uint64, canAccessProject func(uint32) bool) (map[string]*Status, error) {
	args := pgx.NamedArgs{"tenantId": tenantID, "userId": userID, "providers": PROVIDERS}

	var github, linear, jira, slack, msteams bool
	if err := s.conn.QueryRow(accountStatusSQL, args).Scan(&github, &linear, &jira, &slack, &msteams); err != nil {
		return nil, fmt.Errorf("failed to get account integrations status: %v", err)
	}
	status := map[string]*Status{
		"github":  {Scope: ScopeUser, Integrated: github},
		"jira":    {Scope: ScopeUser, Integrated: jira},
		"linear":  {Scope: ScopeUser, Integrated: linear},
		"slack":   {Scope: ScopeTenant, Integrated: slack},
		"msteams": {Scope: ScopeTenant, Integrated: msteams},
	}
	for _, provider := range PROVIDERS {
		status[provider] = &Status{Scope: ScopeProject, ProjectIDs: []uint32{}}
	}

	rows, err := s.conn.Query(projectStatusSQL, args)
	if err != nil {
		return nil, fmt.Errorf("failed to get project integrations status: %v", err)
	}
	defer rows.Close()
	for rows.Next() {
		var provider string
		var projectID uint32
		if err := rows.Scan(&provider, &projectID); err != nil {
			return nil, fmt.Errorf("failed to scan project integration: %v", err)
		}
		st, ok := status[provider]
		if !ok || !canAccessProject(projectID) {
			continue
		}
		st.ProjectIDs = append(st.ProjectIDs, projectID)
		st.Integrated = true
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to read project integrations status: %v", err)
	}
	return status, nil
}
