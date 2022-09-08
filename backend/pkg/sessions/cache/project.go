package cache

import (
	"openreplay/backend/pkg/sessions"
	"time"
)

type ProjectMeta struct {
	*sessions.Project
	expirationTime time.Time
}

func (c *sessionsImpl) GetProjectByKey(projectKey string) (*sessions.Project, error) {
	pmInterface, found := c.projectsByKeys.Load(projectKey)
	if found {
		if pm, ok := pmInterface.(*ProjectMeta); ok {
			if time.Now().Before(pm.expirationTime) {
				return pm.Project, nil
			}
		}
	}
	p, err := c.getProjectByKey(projectKey)
	if err != nil {
		return nil, err
	}
	c.projectsByKeys.Store(projectKey, p)
	return p, nil
}

func (c *sessionsImpl) GetProject(projectID uint32) (*sessions.Project, error) {
	if c.projects[projectID] != nil &&
		time.Now().Before(c.projects[projectID].expirationTime) {
		return c.projects[projectID].Project, nil
	}
	p, err := c.getProject(projectID)
	if err != nil {
		return nil, err
	}
	c.projects[projectID] = &ProjectMeta{p, time.Now().Add(c.projectExpirationTimeout)}
	return p, nil
}

func (c *sessionsImpl) getProjectByKey(projectKey string) (*sessions.Project, error) {
	p := &sessions.Project{ProjectKey: projectKey}
	if err := c.conn.QueryRow(`
		SELECT max_session_duration, sample_rate, project_id
		FROM projects
		WHERE project_key=$1 AND active = true
	`,
		projectKey,
	).Scan(&p.MaxSessionDuration, &p.SampleRate, &p.ProjectID); err != nil {
		return nil, err
	}
	return p, nil
}

func (c *sessionsImpl) getProject(projectID uint32) (*sessions.Project, error) {
	p := &sessions.Project{ProjectID: projectID}
	if err := c.conn.QueryRow(`
		SELECT project_key, max_session_duration, save_request_payloads,
			metadata_1, metadata_2, metadata_3, metadata_4, metadata_5,
			metadata_6, metadata_7, metadata_8, metadata_9, metadata_10
		FROM projects
		WHERE project_id=$1 AND active = true
	`,
		projectID,
	).Scan(&p.ProjectKey, &p.MaxSessionDuration, &p.SaveRequestPayloads,
		&p.Metadata1, &p.Metadata2, &p.Metadata3, &p.Metadata4, &p.Metadata5,
		&p.Metadata6, &p.Metadata7, &p.Metadata8, &p.Metadata9, &p.Metadata10); err != nil {
		return nil, err
	}
	return p, nil
}
