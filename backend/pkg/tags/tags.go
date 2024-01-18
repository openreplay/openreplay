package tags

import (
	"log"
	"openreplay/backend/pkg/db/postgres/pool"
)

type Tag struct {
	ID       int    `json:"id"`
	Selector string `json:"selector"`
}

type Tags interface {
	Get(projectID uint32) ([]Tag, error)
}

type tagsImpl struct {
	db pool.Pool
}

func New(db pool.Pool) Tags {
	return &tagsImpl{
		db: db,
	}
}

func (t *tagsImpl) Get(projectID uint32) ([]Tag, error) {
	rows, err := t.db.Query(`SELECT tag_id, selector FROM tags WHERE project_id = $1 AND deleted_at IS NULL`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tags []Tag
	var id int
	var selector string
	for rows.Next() {
		if err := rows.Scan(&id, &selector); err != nil {
			log.Printf("can't scan tag: %s", err)
			continue
		}
		tags = append(tags, Tag{
			ID:       id,
			Selector: selector,
		})
	}
	return tags, nil
}
