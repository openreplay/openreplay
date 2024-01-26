package tags

import (
	"log"
	"openreplay/backend/pkg/cache"
	"openreplay/backend/pkg/db/postgres/pool"
	"time"
)

type Tag struct {
	ID              int    `json:"id"`
	Selector        string `json:"selector"`
	IgnoreClickRage bool   `json:"icr"`
	IgnoreDeadClick bool   `json:"idc"`
}

type Tags interface {
	Get(projectID uint32) ([]Tag, error)
	ShouldIgnoreTag(projectID uint32, selector string) bool
}

type tagsImpl struct {
	db    pool.Pool
	cache cache.Cache
}

func New(db pool.Pool) Tags {
	return &tagsImpl{
		db:    db,
		cache: cache.New(time.Minute*5, time.Minute*10),
	}
}

func (t *tagsImpl) Get(projectID uint32) ([]Tag, error) {
	rows, err := t.db.Query(`
		SELECT tag_id, selector, ignore_click_rage, ignore_dead_click 
		FROM tags WHERE project_id = $1 AND deleted_at IS NULL`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var (
		tags            []Tag
		id              int
		selector        string
		ignoreClickRage bool
		ignoreDeadClick bool
	)
	for rows.Next() {
		if err := rows.Scan(&id, &selector, &ignoreClickRage, &ignoreDeadClick); err != nil {
			log.Printf("can't scan tag: %s", err)
			continue
		}
		tags = append(tags, Tag{
			ID:              id,
			Selector:        selector,
			IgnoreClickRage: ignoreClickRage,
			IgnoreDeadClick: ignoreDeadClick,
		})
	}
	if tags == nil {
		return []Tag{}, nil
	}
	return tags, nil
}

func (t *tagsImpl) ShouldIgnoreTag(projectID uint32, selector string) bool {
	var (
		tags              []Tag
		err               error
		needToUpdateCache bool
	)
	tagsData, ok := t.cache.Get(projectID)
	if !ok {
		// Try to load from DB and update cache
		tagsData, err = t.Get(projectID)
		if err != nil {
			log.Printf("can't get tags info: %s", err)
			return false
		}
		needToUpdateCache = true
	}
	tags = tagsData.([]Tag)
	if needToUpdateCache {
		t.cache.Set(projectID, tags)
	}
	for _, tag := range tags {
		if tag.Selector == selector {
			return true
		}
	}
	return false
}
