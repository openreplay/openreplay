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
	Conditions []Condition `json:"conditions"`
}

func (c *conditionsImpl) Get(projectID uint32) (*Response, error) {
	conditions := &Response{}
	//err := c.db.QueryRow(`
	//	SELECT
	//		json_agg(
	//			json_build_object(
	//				'condition_id', condition_id,
	//				'condition_type', condition_type,
	//				'operator', operator,
	//				'value', value
	//			)
	//		) AS conditions
	//	FROM
	//		conditions
	//	WHERE
	//		project_id = $1
	//`, projectID).Scan(&conditions.Conditions)
	//if err != nil {
	//	return nil, err
	//}

	// Mock response
	conditions.Conditions = []Condition{
		{
			Type:     CustomEvent,
			Operator: Contains,
			Values:   []string{"record"},
		},
		{
			Type:     VisitedURL,
			Operator: StartsWith,
			Values:   []string{"https://en.wikipedia.org/wiki/Public_holidays_in_France"},
		},
		{
			Type:     FeatureFlag,
			Operator: Is,
			Values:   []string{"test-buffering-flag"},
		},
	}
	return conditions, nil
}
