package cache

import (
	"log"
	"openreplay/backend/pkg/db/postgres"
	"openreplay/backend/pkg/db/types"
	"sync"
	"time"
)

type SessionMeta struct {
	*types.Session
	lastUse time.Time
}

type ProjectMeta struct {
	*types.Project
	expirationTime time.Time
}

type Cache interface {
	SetSession(sess *types.Session) // TODO: check why but I never use SetSession(nil)
	HasSession(sessID uint64) bool
	GetSession(sessID uint64) (*types.Session, error)
	GetProject(projectID uint32) (*types.Project, error)
	GetProjectByKey(projectKey string) (*types.Project, error)
}

type cacheImpl struct {
	conn                     *postgres.Conn
	mutex                    sync.RWMutex
	sessions                 map[uint64]*SessionMeta
	projects                 map[uint32]*ProjectMeta
	projectsByKeys           sync.Map
	projectExpirationTimeout time.Duration
}

func NewCache(conn *postgres.Conn, projectExpiration time.Duration) Cache {
	newCache := &cacheImpl{
		conn:                     conn,
		sessions:                 make(map[uint64]*SessionMeta),
		projects:                 make(map[uint32]*ProjectMeta),
		projectExpirationTimeout: projectExpiration,
	}
	go newCache.cleaner()
	return newCache
}

func (c *cacheImpl) cleaner() {
	cleanTick := time.Tick(time.Minute * 5)
	for {
		select {
		case <-cleanTick:
			c.clearCache()
		}
	}
}

func (c *cacheImpl) clearCache() {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	now := time.Now()
	cacheSize := len(c.sessions)
	deleted := 0
	for id, sess := range c.sessions {
		if now.Sub(sess.lastUse).Minutes() > 3 {
			deleted++
			delete(c.sessions, id)
		}
	}
	log.Printf("cache cleaner: deleted %d/%d sessions", deleted, cacheSize)
}
