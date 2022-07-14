package postgres

import (
	. "openreplay/backend/pkg/db/types"
)

func (conn *Conn) GetProjectByKey(projectKey string) (*Project, error) {
	p := &Project{ProjectKey: projectKey}
	if err := conn.c.QueryRow(`
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

// TODO: logical separation of metadata
func (conn *Conn) GetProject(projectID uint32) (*Project, error) {
	p := &Project{ProjectID: projectID}
	if err := conn.c.QueryRow(`
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
