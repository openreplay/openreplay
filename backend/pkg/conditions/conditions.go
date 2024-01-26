package conditions

import (
	"openreplay/backend/pkg/db/postgres/pool"
)

type Conditions interface{}

type conditionsImpl struct{}

func New(db pool.Pool) Conditions {
	return &conditionsImpl{}
}
