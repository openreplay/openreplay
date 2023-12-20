package conditions

import "openreplay/backend/pkg/db/postgres/pool"

type Conditions interface {
	Get(projectID uint32) (*Response, error)
}

type conditionsImpl struct {
	db pool.Pool
}

func New(db pool.Pool) Conditions {
	return &conditionsImpl{
		db: db,
	}
}

type ConditionType string

const (
	VisitedURL      ConditionType = "visited_url"
	RequestURL      ConditionType = "request_url"
	ClickLabel      ConditionType = "click_label"
	ClickSelector   ConditionType = "click_selector"
	CustomEvent     ConditionType = "custom_event"
	Exception       ConditionType = "exception"
	FeatureFlag     ConditionType = "feature_flag"
	SessionDuration ConditionType = "session_duration"
)

type ConditionOperator string

const (
	Is          ConditionOperator = "is"
	IsNot       ConditionOperator = "isNot"
	Contains    ConditionOperator = "contains"
	NotContains ConditionOperator = "notContains"
	StartsWith  ConditionOperator = "startsWith"
	EndsWith    ConditionOperator = "endsWith"
)

type Condition struct {
	Type     ConditionType     `json:"type"`
	Operator ConditionOperator `json:"operator"`
	Values   []string          `json:"value"`
}

type Response struct {
	Conditions interface{} `json:"conditions"`
}

func (c *conditionsImpl) Get(projectID uint32) (*Response, error) {
	var conditions interface{}
	err := c.db.QueryRow(`
		SELECT conditions
		FROM projects
		WHERE project_id = $1
	`, projectID).Scan(&conditions)
	if err != nil {
		return nil, err
	}

	return &Response{Conditions: conditions}, nil
}
