package conditions

import (
	"fmt"
	"openreplay/backend/pkg/db/postgres/pool"
)

type Conditions interface {
	GetRate(projectID uint32, condition string, def int) (int, error)
	GetProjectConditions(projectID uint32) (interface{}, error)
	UpdateConditions(projectID uint32, sampleRate int, conditionalCapture bool, conditions []interface{}) (interface{}, error)
}

type conditionsImpl struct {
	db pool.Pool
}

func (c *conditionsImpl) GetRate(projectID uint32, condition string, def int) (int, error) {
	return def, nil
}

func New(db pool.Pool) Conditions {
	return &conditionsImpl{
		db: db,
	}
}

type ProjectConditionsResponse struct {
	Rate               int  `json:"rate"`
	ConditionalCapture bool `json:"conditionalCapture"`
}

type PostConditionsRequest struct {
	SampleRate         int           `json:"rate" validate:"min=0,max=100"`
	ConditionalCapture bool          `json:"conditionalCapture"`
	Conditions         []interface{} `json:"conditions, omitempty"`
}

func (c *conditionsImpl) GetProjectConditions(projectID uint32) (interface{}, error) {
	var rate int
	var conditionalCapture bool
	err := c.db.QueryRow(`
		SELECT sample_rate, conditional_capture
		FROM public.projects
		WHERE project_id = $1 AND deleted_at IS NULL
	`, projectID).Scan(&rate, &conditionalCapture)
	if err != nil {
		return nil, fmt.Errorf("failed to get project data: %w", err)
	}

	proConditions := ProjectConditionsResponse{
		Rate:               rate,
		ConditionalCapture: conditionalCapture,
	}

	return proConditions, nil
}

func (c *conditionsImpl) UpdateConditions(projectID uint32, sampleRate int, conditionalCapture bool, conditions []interface{}) (interface{}, error) {
	err := c.db.Exec(`
		UPDATE public.projects
		SET sample_rate = $1, conditional_capture = $2
		WHERE project_id = $3 AND deleted_at IS NULL`,
		sampleRate, conditionalCapture, projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to update projects table: %w", err)
	}

	updatedProConditions, err := c.GetProjectConditions(projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to get updated conditions: %w", err)
	}

	return updatedProConditions, nil
}
