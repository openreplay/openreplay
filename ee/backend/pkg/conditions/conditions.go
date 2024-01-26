package conditions

import (
	"fmt"
	"log"
	"openreplay/backend/pkg/db/postgres/pool"
)

type Conditions interface {
	Get(projectID uint32) (*Response, error)
	GetRate(projectID uint32, condition string, def int) (int, error)
}

type conditionsImpl struct {
	db    pool.Pool
	cache map[uint32]map[string]int // projectID -> condition -> rate
}

func New(db pool.Pool) Conditions {
	return &conditionsImpl{
		db:    db,
		cache: make(map[uint32]map[string]int),
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

type ConditionSet struct {
	Name    string      `json:"name"`
	Filters interface{} `json:"filters"`
	Rate    int         `json:"capture_rate"`
}

type Response struct {
	Conditions interface{} `json:"conditions"`
}

func (c *conditionsImpl) getConditions(projectID uint32) ([]ConditionSet, error) {
	var conditions []ConditionSet
	rows, err := c.db.Query(`
		SELECT name, capture_rate, filters
		FROM projects_conditions
		WHERE project_id = $1
	`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var name string
		var rate int
		var filters interface{}
		if err := rows.Scan(&name, &rate, &filters); err != nil {
			log.Printf("can't scan row: %s", err)
			continue
		}
		conditions = append(conditions, ConditionSet{
			Name:    name,
			Filters: filters,
			Rate:    rate,
		})
	}

	// Save project's conditions to cache
	conditionSet := make(map[string]int)
	for _, condition := range conditions {
		conditionSet[condition.Name] = condition.Rate
	}
	c.cache[projectID] = conditionSet

	if conditions == nil {
		return []ConditionSet{}, nil
	}
	return conditions, nil
}

func (c *conditionsImpl) Get(projectID uint32) (*Response, error) {
	conditions, err := c.getConditions(projectID)
	return &Response{Conditions: conditions}, err
}

func (c *conditionsImpl) GetRate(projectID uint32, condition string, def int) (int, error) {
	proj, ok := c.cache[projectID]
	if ok {
		rate, ok := proj[condition]
		if ok {
			return rate, nil
		}
	}
	// Don't have project's conditions in cache or particular condition
	_, err := c.getConditions(projectID)
	if err != nil {
		return 0, err
	}
	rate, ok := c.cache[projectID][condition]
	if !ok {
		return 0, fmt.Errorf("condition %s not found", condition)
	}
	return rate, nil
}
