package cache

import (
	"errors"
	"openreplay/backend/pkg/db/postgres"
	"openreplay/backend/pkg/sessions"
	"sync"
	"time"
)

type Sessions interface {
	AddSession(session *sessions.Session)
	HasSession(sessionID uint64) bool
	GetSession(sessionID uint64) (*sessions.Session, error)
	GetMetadataNo(sessionID uint64, key string) (uint, error)
	GetProjectByKey(projectKey string) (*sessions.Project, error)
}

func (c *sessionsImpl) GetMetadataNo(sessionID uint64, key string) (uint, error) {
	sess, err := c.GetSession(sessionID)
	if err != nil {
		return 0, err
	}
	proj, err := c.GetProject(sess.ProjectID)
	if err != nil {
		return 0, err
	}
	keyNo := proj.GetMetadataNo(key)
	if keyNo == 0 {
		// TODO: insert project metadata
		return 0, errors.New("zero key number")
	}
	return keyNo, nil
}

type sessionsImpl struct {
	conn                     postgres.Pool
	sessions                 map[uint64]*sessions.Session //remove by timeout to avoid memory leak
	projects                 map[uint32]*ProjectMeta
	projectsByKeys           sync.Map
	projectExpirationTimeout time.Duration
}

func New(pgConn postgres.Pool, projectExpirationTimeoutMs int64) (Sessions, error) {
	return &sessionsImpl{
		conn:                     pgConn,
		sessions:                 make(map[uint64]*sessions.Session),
		projects:                 make(map[uint32]*ProjectMeta),
		projectExpirationTimeout: time.Duration(1000 * projectExpirationTimeoutMs),
	}, nil
}
