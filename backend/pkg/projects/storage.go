package projects

import (
	"fmt"

	"openreplay/backend/pkg/db/postgres"
)

func (c *projectsImpl) getProjectByKey(projectKey string) (*Project, error) {
	p := &Project{ProjectKey: projectKey}
	if err := c.db.QueryRow(`
		SELECT project_id, name, active, max_session_duration, save_request_payloads, sample_rate, beacon_size, platform,
			metadata_1, metadata_2, metadata_3, metadata_4, metadata_5,
			metadata_6, metadata_7, metadata_8, metadata_9, metadata_10
		FROM projects
		WHERE project_key=$1 AND deleted_at IS NULL
	`,
		projectKey,
	).Scan(&p.ProjectID, &p.Name, &p.Active, &p.MaxSessionDuration, &p.SaveRequestPayloads, &p.SampleRate, &p.BeaconSize, &p.Platform,
		&p.Metadata1, &p.Metadata2, &p.Metadata3, &p.Metadata4, &p.Metadata5,
		&p.Metadata6, &p.Metadata7, &p.Metadata8, &p.Metadata9, &p.Metadata10); err != nil {
		return nil, err
	}
	return p, nil
}

func (c *projectsImpl) getProject(projectID uint32) (*Project, error) {
	p := &Project{ProjectID: projectID}
	if err := c.db.QueryRow(`
		SELECT project_key, name, active, max_session_duration, save_request_payloads, sample_rate, beacon_size, platform,
			metadata_1, metadata_2, metadata_3, metadata_4, metadata_5,
			metadata_6, metadata_7, metadata_8, metadata_9, metadata_10
		FROM projects
		WHERE project_id=$1 AND deleted_at IS NULL
	`,
		projectID,
	).Scan(&p.ProjectKey, &p.Name, &p.Active, &p.MaxSessionDuration, &p.SaveRequestPayloads, &p.SampleRate, &p.BeaconSize, &p.Platform,
		&p.Metadata1, &p.Metadata2, &p.Metadata3, &p.Metadata4, &p.Metadata5,
		&p.Metadata6, &p.Metadata7, &p.Metadata8, &p.Metadata9, &p.Metadata10); err != nil {
		return nil, err
	}
	return p, nil
}

func (c *projectsImpl) listProjects() ([]*Project, error) {
	rows, err := c.db.Query(`
		SELECT project_id, project_key, name, active, max_session_duration, save_request_payloads, sample_rate, beacon_size, platform,
			metadata_1, metadata_2, metadata_3, metadata_4, metadata_5,
			metadata_6, metadata_7, metadata_8, metadata_9, metadata_10
		FROM projects
		WHERE active = true AND deleted_at IS NULL
		ORDER BY project_id
		LIMIT 100
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var projects []*Project
	for rows.Next() {
		p := &Project{}
		if err := rows.Scan(&p.ProjectID, &p.ProjectKey, &p.Name, &p.Active, &p.MaxSessionDuration, &p.SaveRequestPayloads, &p.SampleRate, &p.BeaconSize, &p.Platform,
			&p.Metadata1, &p.Metadata2, &p.Metadata3, &p.Metadata4, &p.Metadata5,
			&p.Metadata6, &p.Metadata7, &p.Metadata8, &p.Metadata9, &p.Metadata10); err != nil {
			return nil, err
		}
		projects = append(projects, p)
	}
	return projects, rows.Err()
}

func (c *projectsImpl) existsByName(name string) (bool, error) {
	escaped := postgres.EscapeILIKE(name)
	var exists bool
	if err := c.db.QueryRow(`
		SELECT EXISTS(
			SELECT 1 FROM projects
			WHERE deleted_at IS NULL AND name ILIKE $1 ESCAPE '\'
		)
	`, escaped).Scan(&exists); err != nil {
		return false, err
	}
	return exists, nil
}

func (c *projectsImpl) createProject(name string, platform string) (*Project, error) {
	var projectID uint32
	if err := c.db.QueryRow(`
		INSERT INTO projects (name, platform, active)
		VALUES ($1, $2, TRUE)
		RETURNING project_id
	`, name, platform).Scan(&projectID); err != nil {
		return nil, fmt.Errorf("failed to create project: %w", err)
	}
	p, err := c.getProject(projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve created project: %w", err)
	}
	return p, nil
}

func (c *projectsImpl) getProjectNotDeleted(projectID uint32) (*Project, error) {
	return c.getProject(projectID)
}
