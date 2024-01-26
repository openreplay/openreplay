package conditions

import (
	"openreplay/backend/pkg/db/postgres/pool"
)

type Conditions interface {
	GetRate(projectID uint32, condition string, def int) (int, error)
}

type conditionsImpl struct{}

func (c *conditionsImpl) GetRate(projectID uint32, condition string, def int) (int, error) {
	return def, nil
}

func New(db pool.Pool) Conditions {
	return &conditionsImpl{}
}
