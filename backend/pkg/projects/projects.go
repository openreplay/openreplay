package projects

import (
	"openreplay/backend/pkg/db/postgres"
	"openreplay/backend/pkg/db/types"
	"sync"
	"time"
)

type Projects interface {
	GetProject(projectID uint32) (*types.Project, error)
	GetProjectByKey(projectKey string) (*types.Project, error)
}

type ProjectMeta struct {
	*types.Project
	expirationTime time.Time
}

type projectsImpl struct {
	db                       *postgres.Conn
	projects                 map[uint32]*ProjectMeta
	projectsByKeys           sync.Map
	projectExpirationTimeout time.Duration
}

func New(db *postgres.Conn) Projects {
	return &projectsImpl{db: db}
}

//---------------------------------------------

func (c *projectsImpl) GetProjectByKey(projectKey string) (*types.Project, error) {
	pmInterface, found := c.projectsByKeys.Load(projectKey)
	if found {
		if pm, ok := pmInterface.(*ProjectMeta); ok {
			if time.Now().Before(pm.expirationTime) {
				return pm.Project, nil
			}
		}
	}

	p, err := c.GetProjectByKey(projectKey)
	if err != nil {
		return nil, err
	}
	//c.projects[ p.ProjectID ] = &ProjectMeta{ p, time.Now().Add(c.projectExpirationTimeout) }
	c.projectsByKeys.Store(projectKey, p)
	return p, nil
}

func (c *projectsImpl) GetProject(projectID uint32) (*types.Project, error) {
	if c.projects[projectID] != nil &&
		time.Now().Before(c.projects[projectID].expirationTime) {
		return c.projects[projectID].Project, nil
	}
	p, err := c.GetProject(projectID)
	if err != nil {
		return nil, err
	}
	c.projects[projectID] = &ProjectMeta{p, time.Now().Add(c.projectExpirationTimeout)}
	//c.projectsByKeys.Store(p.ProjectKey, c.projects[ projectID ])
	return p, nil
}

//---------------------------------------------

func (c *projectsImpl) getProjectByKey(projectKey string) (*types.Project, error) {
	p := &types.Project{ProjectKey: projectKey}
	if err := c.db.Pool.QueryRow(`
		SELECT max_session_duration, sample_rate, project_id, beacon_size
		FROM projects
		WHERE project_key=$1 AND active = true
	`,
		projectKey,
	).Scan(&p.MaxSessionDuration, &p.SampleRate, &p.ProjectID, &p.BeaconSize); err != nil {
		return nil, err
	}
	return p, nil
}

// TODO: logical separation of metadata
func (c *projectsImpl) getProject(projectID uint32) (*types.Project, error) {
	p := &types.Project{ProjectID: projectID}
	if err := c.db.Pool.QueryRow(`
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
