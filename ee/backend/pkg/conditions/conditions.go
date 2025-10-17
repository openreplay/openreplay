package conditions

import (
	"encoding/json"
	"fmt"
	"log"
	"openreplay/backend/pkg/analytics/model"
	"openreplay/backend/pkg/db/postgres/pool"
	"strings"
)

type Conditions interface {
	Get(projectID uint32) (*Response, error)
	GetProjectConditions(projectID uint32) (interface{}, error)
	GetRate(projectID uint32, condition string, def int) (int, error)
	UpdateConditions(projectID uint32, sampleRate int, conditionalCapture bool, conditions []ConditionSet) (interface{}, error)
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

type ConditionSet struct {
	ConditionID *uint32        `json:"conditionId,omitempty"`
	Name        string         `json:"name"`
	Filters     []model.Filter `json:"filters" validate:"dive"`
	Rate        int            `json:"captureRate" validate:"min=0,max=100"`
}

type ProjectConditionsResponse struct {
	Rate               int            `json:"rate"`
	ConditionalCapture bool           `json:"conditionalCapture"`
	Conditions         []ConditionSet `json:"conditions"`
}

type PostConditionsRequest struct {
	SampleRate         int            `json:"rate" validate:"min=0,max=100"`
	ConditionalCapture bool           `json:"conditionalCapture"`
	Conditions         []ConditionSet `json:"conditions" validate:"dive"`
}

type Response struct {
	Conditions interface{} `json:"conditions"`
}

type conditionOperation struct {
	toCreate []ConditionSet
	toUpdate []ConditionSet
	toDelete []uint32
}

type ValidationError struct {
	Message string `json:"message"`
}

func (c *conditionsImpl) validateConditions(conditions []ConditionSet) []string {
	var errors []string
	names := make([]string, len(conditions))
	nameCount := make(map[string]int)

	for i, condition := range conditions {
		names[i] = condition.Name
		nameCount[condition.Name]++
	}

	for _, name := range names {
		if strings.TrimSpace(name) == "" {
			errors = append(errors, "Condition names cannot be empty strings")
			break
		}
	}

	var duplicates []string
	for name, count := range nameCount {
		if count > 1 {
			duplicates = append(duplicates, name)
		}
	}
	if len(duplicates) > 0 {
		errors = append(errors, fmt.Sprintf("Duplicate condition names found: %v", duplicates))
	}

	return errors
}

func (c *conditionsImpl) getConditions(projectID uint32) ([]ConditionSet, error) {
	var conditions []ConditionSet
	rows, err := c.db.Query(`
		SELECT condition_id, name, capture_rate, filters
		FROM public.projects_conditions
		WHERE project_id = $1
	`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var conditionID uint32
		var name string
		var rate int
		var filtersBytes []byte
		if err := rows.Scan(&conditionID, &name, &rate, &filtersBytes); err != nil {
			log.Printf("can't scan row: %s", err)
			continue
		}
		var filters []model.Filter
		if err := json.Unmarshal(filtersBytes, &filters); err != nil {
			log.Printf("can't unmarshal filters: %s", err)
			continue
		}
		conditions = append(conditions, ConditionSet{
			ConditionID: &conditionID,
			Name:        name,
			Filters:     filters,
			Rate:        rate,
		})
	}

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

	conditions, err := c.getConditions(projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to get conditions: %w", err)
	}

	proConditions := ProjectConditionsResponse{
		Rate:               rate,
		ConditionalCapture: conditionalCapture,
		Conditions:         conditions,
	}

	return proConditions, nil
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

func (c *conditionsImpl) upsertProjectConditions(tx *pool.Tx, projectID uint32, conditions []ConditionSet, isUpdate bool) error {
	if len(conditions) == 0 {
		return nil
	}

	for _, condition := range conditions {
		filtersJSON, err := json.Marshal(condition.Filters)
		if err != nil {
			return fmt.Errorf("failed to marshal filters for condition %s: %w", condition.Name, err)
		}

		if isUpdate {
			err = tx.TxExec(`
				UPDATE public.projects_conditions
				SET name = $1, capture_rate = $2, filters = $3
				WHERE condition_id = $4 AND project_id = $5`,
				condition.Name, condition.Rate, filtersJSON, *condition.ConditionID, projectID)
		} else {
			err = tx.TxExec(`
				INSERT INTO public.projects_conditions (project_id, name, capture_rate, filters)
				VALUES ($1, $2, $3, $4)`,
				projectID, condition.Name, condition.Rate, filtersJSON)
		}

		if err != nil {
			action := "insert"
			if isUpdate {
				action = "update"
			}
			return fmt.Errorf("failed to %s condition %s: %w", action, condition.Name, err)
		}
	}
	return nil
}

func (c *conditionsImpl) deleteProjectCondition(tx *pool.Tx, projectID uint32, ids []uint32) error {
	if len(ids) == 0 {
		return nil
	}

	args := make([]interface{}, len(ids))
	placeholders := make([]string, len(ids))
	for i, id := range ids {
		args[i] = id
		placeholders[i] = fmt.Sprintf("$%d", i+2)
	}

	query := fmt.Sprintf(`
		DELETE FROM public.projects_conditions
		WHERE condition_id IN (%s) AND project_id = $1`,
		strings.Join(placeholders, ","))

	allArgs := append([]interface{}{projectID}, args...)
	err := tx.TxExec(query, allArgs...)
	if err != nil {
		return fmt.Errorf("failed to delete conditions: %w", err)
	}
	return nil
}

func (c *conditionsImpl) categorizeConditions(existing []ConditionSet, incoming []ConditionSet, existingIDs map[uint32]bool) conditionOperation {
	var toUpdate []ConditionSet
	var toCreate []ConditionSet
	var toDelete []uint32

	newIDs := make(map[uint32]bool)
	for _, condition := range incoming {
		if condition.ConditionID != nil && existingIDs[*condition.ConditionID] {
			toUpdate = append(toUpdate, condition)
			newIDs[*condition.ConditionID] = true
		} else {
			toCreate = append(toCreate, condition)
		}
	}

	for id := range existingIDs {
		if !newIDs[id] {
			toDelete = append(toDelete, id)
		}
	}

	return conditionOperation{
		toCreate: toCreate,
		toUpdate: toUpdate,
		toDelete: toDelete,
	}
}

func (c *conditionsImpl) updateProjectConditions(tx *pool.Tx, projectID uint32, conditions []ConditionSet, existing []ConditionSet, existingIDs map[uint32]bool) error {
	ops := c.categorizeConditions(existing, conditions, existingIDs)

	if len(ops.toDelete) > 0 {
		if err := c.deleteProjectCondition(tx, projectID, ops.toDelete); err != nil {
			return err
		}
	}

	if len(ops.toCreate) > 0 {
		if err := c.upsertProjectConditions(tx, projectID, ops.toCreate, false); err != nil {
			return err
		}
	}

	if len(ops.toUpdate) > 0 {
		if err := c.upsertProjectConditions(tx, projectID, ops.toUpdate, true); err != nil {
			return err
		}
	}

	return nil
}

func (c *conditionsImpl) UpdateConditions(projectID uint32, sampleRate int, conditionalCapture bool, conditions []ConditionSet) (interface{}, error) {
	for i := range conditions {
		conditions[i].Name = strings.TrimSpace(conditions[i].Name)
	}

	validationErrors := c.validateConditions(conditions)
	if len(validationErrors) > 0 {
		return nil, fmt.Errorf("validation errors: %s", strings.Join(validationErrors, "; "))
	}

	existing, err := c.getConditions(projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to get existing conditions: %w", err)
	}

	existingIDs := make(map[uint32]bool)
	for _, cond := range existing {
		if cond.ConditionID != nil {
			existingIDs[*cond.ConditionID] = true
		}
	}

	for _, cond := range conditions {
		if cond.ConditionID != nil && !existingIDs[*cond.ConditionID] {
			return nil, fmt.Errorf("condition with id %d does not exist", *cond.ConditionID)
		}
	}

	tx, err := c.db.Begin()
	if err != nil {
		return nil, fmt.Errorf("failed to start transaction: %w", err)
	}
	defer func() {
		if err != nil {
			tx.TxRollback()
		}
	}()

	err = tx.TxExec(`
		UPDATE public.projects
		SET sample_rate = $1, conditional_capture = $2
		WHERE project_id = $3 AND deleted_at IS NULL`,
		sampleRate, conditionalCapture, projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to update projects table: %w", err)
	}

	err = c.updateProjectConditions(tx, projectID, conditions, existing, existingIDs)
	if err != nil {
		return nil, err
	}

	err = tx.TxCommit()
	if err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	updatedProConditions, err := c.GetProjectConditions(projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to get updated conditions: %w", err)
	}

	return updatedProConditions, nil
}
