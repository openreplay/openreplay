package users

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"

	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/users/model"
)

type Users interface {
	GetByUserID(projID uint32, userId string) (*model.User, error)
	SearchUsers(projID uint32, req *model.SearchUsersRequest) ([]*model.SearchUsersResponse, error)
	UpdateUser(projID uint32, user *model.User) (*model.User, error)
	DeleteUser(projID uint32, userID uint32) (*model.User, error)
}

type usersImpl struct {
	log    logger.Logger
	chConn driver.Conn
}

func New(log logger.Logger, conn driver.Conn) (Users, error) {
	return &usersImpl{
		log:    log,
		chConn: conn,
	}, nil
}

func (u *usersImpl) GetByUserID(projID uint32, userId string) (*model.User, error) {
	query := `SELECT 
		project_id, "$user_id", "$email", "$name", "$first_name", "$last_name", "$phone", "$avatar",
		toInt64(toUnixTimestamp("$created_at") * 1000) AS created_at, toString(properties) AS properties, group_id1, group_id2, group_id3, group_id4, group_id5, group_id6,
		"$sdk_edition", "$sdk_version", "$current_url", "$initial_referrer", "$referring_domain",
		initial_utm_source, initial_utm_medium, initial_utm_campaign, "$country", "$state", "$city",
		"$or_api_endpoint", "$timezone", toInt64(toUnixTimestamp("$first_event_at") * 1000) AS first_event_at, toInt64(toUnixTimestamp("$last_seen") * 1000) AS last_seen
		FROM product_analytics.users
		WHERE project_id = ? AND "$user_id" = ? AND _deleted_at = 0 AND _is_deleted = 0
		ORDER BY _timestamp DESC
		LIMIT 1`

	row := u.chConn.QueryRow(context.Background(), query, projID, userId)

	user := &model.User{}
	err := row.Scan(
		&user.ProjectID, &user.UserID, &user.Email, &user.Name, &user.FirstName, &user.LastName,
		&user.Phone, &user.Avatar, &user.CreatedAt, &user.PropertiesRaw, &user.GroupID1, &user.GroupID2,
		&user.GroupID3, &user.GroupID4, &user.GroupID5, &user.GroupID6, &user.SDKEdition, &user.SDKVersion,
		&user.CurrentUrl, &user.InitialReferrer, &user.ReferringDomain, &user.InitialUtmSource,
		&user.InitialUtmMedium, &user.InitialUtmCampaign, &user.Country, &user.State, &user.City,
		&user.OrAPIEndpoint, &user.Timezone, &user.FirstEventAt, &user.LastSeen,
	)
	if err != nil {
		u.log.Error(context.Background(), "failed to get user by ID: %v", err)
		return nil, fmt.Errorf("failed to get user by ID: %w", err)
	}

	if err := user.UnmarshalProperties(); err != nil {
		u.log.Error(context.Background(), "failed to unmarshal properties: %v", err)
		return nil, fmt.Errorf("failed to unmarshal properties: %w", err)
	}

	return user, nil
}

func (u *usersImpl) SearchUsers(projID uint32, req *model.SearchUsersRequest) ([]*model.SearchUsersResponse, error) {
	if req.Limit == 0 {
		req.Limit = 50
	}
	if req.Page == 0 {
		req.Page = 1
	}

	ctx := context.Background()
	offset := (req.Page - 1) * req.Limit

	whereClause, params := u.buildSearchQueryParams(projID, req)
	selectColumns := u.buildSelectColumns(req.Columns)
	sortBy, sortOrder := u.buildSortClause(req.SortBy, req.SortOrder)

	query := fmt.Sprintf(`
		WITH latest_users AS (
			SELECT *
			FROM product_analytics.users
			WHERE %s AND _is_deleted = 0
			ORDER BY _timestamp DESC
			LIMIT 1 BY project_id, "$user_id"
		)
		SELECT COUNT(*) OVER() as total_count, %s
		FROM latest_users
		ORDER BY %s %s
		LIMIT ? OFFSET ?`,
		whereClause, selectColumns, sortBy, sortOrder)

	queryParams := append(params, req.Limit, offset)

	rows, err := u.chConn.Query(ctx, query, queryParams...)
	if err != nil {
		u.log.Error(ctx, "failed to query users: %v", err)
		return nil, fmt.Errorf("failed to query users: %w", err)
	}
	defer rows.Close()

	var total uint64
	users := []model.User{}
	for rows.Next() {
		user := model.User{}
		scanDest := u.getScanDestinations(&user, req.Columns)

		scanPtrs := append([]interface{}{&total}, scanDest...)
		if err := rows.Scan(scanPtrs...); err != nil {
			u.log.Error(ctx, "failed to scan user row: %v", err)
			return nil, fmt.Errorf("failed to scan user row: %w", err)
		}

		if err := user.UnmarshalProperties(); err != nil {
			u.log.Error(ctx, "failed to unmarshal properties: %v", err)
			continue
		}

		users = append(users, user)
	}

	if err := rows.Err(); err != nil {
		u.log.Error(ctx, "error iterating user rows: %v", err)
		return nil, fmt.Errorf("error iterating user rows: %w", err)
	}

	response := &model.SearchUsersResponse{
		Total: total,
		Users: users,
	}

	return []*model.SearchUsersResponse{response}, nil
}

func (u *usersImpl) buildSearchQueryParams(projID uint32, req *model.SearchUsersRequest) (string, []interface{}) {
	baseConditions := []string{
		"project_id = ?",
		"_deleted_at = 0",
	}
	params := []interface{}{projID}

	// Query string search for name, email, or user_id
	if req.Query != "" {
		queryPattern := "%" + req.Query + "%"
		queryCondition := `("$user_id" ILIKE ? OR "$email" ILIKE ? OR "$name" ILIKE ?)`
		baseConditions = append(baseConditions, queryCondition)
		params = append(params, queryPattern, queryPattern, queryPattern)
	}

	for _, filter := range req.Filters {
		cond, condParams := u.buildFilterCondition(filter)
		if cond != "" {
			baseConditions = append(baseConditions, cond)
			params = append(params, condParams...)
		}
	}

	whereClause := strings.Join(baseConditions, " AND ")
	return whereClause, params
}

func (u *usersImpl) buildFilterCondition(filter model.UserFilter) (string, []interface{}) {
	mappedCol, ok := model.ColumnMapping[filter.Name]
	if !ok {
		mappedCol = filter.Name
	}

	switch filter.Operator {
	case "isAny":
		return fmt.Sprintf("isNotNull(%s)", mappedCol), nil

	case "isUndefined":
		return fmt.Sprintf("isNull(%s)", mappedCol), nil

	case "is":
		if len(filter.Value) == 0 {
			return "", nil
		}
		if len(filter.Value) == 1 {
			return fmt.Sprintf("%s = ?", mappedCol), []interface{}{filter.Value[0]}
		}
		placeholders := make([]string, len(filter.Value))
		params := make([]interface{}, len(filter.Value))
		for i, v := range filter.Value {
			placeholders[i] = "?"
			params[i] = v
		}
		return fmt.Sprintf("%s IN (%s)", mappedCol, strings.Join(placeholders, ", ")), params

	case "isNot":
		if len(filter.Value) == 0 {
			return "", nil
		}
		if len(filter.Value) == 1 {
			return fmt.Sprintf("%s != ?", mappedCol), []interface{}{filter.Value[0]}
		}
		placeholders := make([]string, len(filter.Value))
		params := make([]interface{}, len(filter.Value))
		for i, v := range filter.Value {
			placeholders[i] = "?"
			params[i] = v
		}
		return fmt.Sprintf("%s NOT IN (%s)", mappedCol, strings.Join(placeholders, ", ")), params

	case "contains":
		if len(filter.Value) == 0 {
			return "", nil
		}
		conditions := make([]string, len(filter.Value))
		params := make([]interface{}, len(filter.Value))
		for i, v := range filter.Value {
			conditions[i] = fmt.Sprintf("%s ILIKE ?", mappedCol)
			params[i] = "%" + v + "%"
		}
		if len(conditions) == 1 {
			return conditions[0], params
		}
		return fmt.Sprintf("(%s)", strings.Join(conditions, " OR ")), params

	case "notContains":
		if len(filter.Value) == 0 {
			return "", nil
		}
		conditions := make([]string, len(filter.Value))
		params := make([]interface{}, len(filter.Value))
		for i, v := range filter.Value {
			conditions[i] = fmt.Sprintf("%s ILIKE ?", mappedCol)
			params[i] = "%" + v + "%"
		}
		cond := strings.Join(conditions, " OR ")
		if len(conditions) == 1 {
			return fmt.Sprintf("NOT (%s)", cond), params
		}
		return fmt.Sprintf("NOT (%s)", cond), params

	case "startsWith":
		if len(filter.Value) == 0 {
			return "", nil
		}
		conditions := make([]string, len(filter.Value))
		params := make([]interface{}, len(filter.Value))
		for i, v := range filter.Value {
			conditions[i] = fmt.Sprintf("%s ILIKE ?", mappedCol)
			params[i] = v + "%"
		}
		if len(conditions) == 1 {
			return conditions[0], params
		}
		return fmt.Sprintf("(%s)", strings.Join(conditions, " OR ")), params

	case "endsWith":
		if len(filter.Value) == 0 {
			return "", nil
		}
		conditions := make([]string, len(filter.Value))
		params := make([]interface{}, len(filter.Value))
		for i, v := range filter.Value {
			conditions[i] = fmt.Sprintf("%s ILIKE ?", mappedCol)
			params[i] = "%" + v
		}
		if len(conditions) == 1 {
			return conditions[0], params
		}
		return fmt.Sprintf("(%s)", strings.Join(conditions, " OR ")), params

	case "=", ">", "<", ">=", "<=", "!=":
		if len(filter.Value) == 0 {
			return "", nil
		}
		return fmt.Sprintf("%s %s ?", mappedCol, filter.Operator), []interface{}{filter.Value[0]}

	default:
		if len(filter.Value) == 0 {
			return "", nil
		}
		if len(filter.Value) == 1 {
			return fmt.Sprintf("%s = ?", mappedCol), []interface{}{filter.Value[0]}
		}
		placeholders := make([]string, len(filter.Value))
		params := make([]interface{}, len(filter.Value))
		for i, v := range filter.Value {
			placeholders[i] = "?"
			params[i] = v
		}
		return fmt.Sprintf("%s IN (%s)", mappedCol, strings.Join(placeholders, ", ")), params
	}
}

func (u *usersImpl) buildSelectColumns(requestedCols []string) string {
	baseColumns := []string{
		"project_id",
		`"$user_id"`,
		`"$email"`,
		`"$name"`,
		`"$first_name"`,
		`"$last_name"`,
		`toInt64(toUnixTimestamp("$created_at") * 1000) AS created_at`,
		`toInt64(toUnixTimestamp("$last_seen") * 1000) AS last_seen`,
	}

	if len(requestedCols) == 0 {
		return strings.Join(baseColumns, ", ")
	}

	for _, col := range requestedCols {
		if col == "$user_id" || col == "$email" || col == "$name" || col == "$first_name" || col == "$last_name" || col == "$created_at" || col == "$last_seen" || col == "project_id" {
			continue
		}
		baseColumns = append(baseColumns, u.formatColumnForSelect(col))
	}

	return strings.Join(baseColumns, ", ")
}

func (u *usersImpl) formatColumnForSelect(col string) string {
	mappedCol, ok := model.ColumnMapping[col]
	if !ok {
		mappedCol = col
	}

	switch col {
	case "$created_at":
		return `toInt64(toUnixTimestamp("$created_at") * 1000) AS created_at`
	case "$first_event_at":
		return `toInt64(toUnixTimestamp("$first_event_at") * 1000) AS first_event_at`
	case "$last_seen":
		return `toInt64(toUnixTimestamp("$last_seen") * 1000) AS last_seen`
	case "properties":
		return "toString(properties) AS properties"
	default:
		return mappedCol
	}
}

func (u *usersImpl) buildSortClause(sortBy, sortOrder string) (string, string) {
	sortCol := "_timestamp"
	if sortBy != "" {
		if mappedCol, ok := model.ColumnMapping[sortBy]; ok {
			sortCol = mappedCol
		} else {
			sortCol = sortBy
		}
	}

	order := "DESC"
	if strings.ToUpper(sortOrder) == "ASC" {
		order = "ASC"
	} else if strings.ToUpper(sortOrder) == "DESC" {
		order = "DESC"
	}

	return sortCol, order
}

func (u *usersImpl) getScanDestinations(user *model.User, requestedCols []string) []interface{} {
	baseDest := []interface{}{
		&user.ProjectID,
		&user.UserID,
		&user.Email,
		&user.Name,
		&user.FirstName,
		&user.LastName,
		&user.CreatedAt,
		&user.LastSeen,
	}

	if len(requestedCols) == 0 {
		return baseDest
	}

	for _, col := range requestedCols {
		if col == "$user_id" || col == "$email" || col == "$name" || col == "$first_name" || col == "$last_name" || col == "$created_at" || col == "$last_seen" || col == "project_id" {
			continue
		}
		switch col {
		case "$phone":
			baseDest = append(baseDest, &user.Phone)
		case "$avatar":
			baseDest = append(baseDest, &user.Avatar)
		case "$country":
			baseDest = append(baseDest, &user.Country)
		case "$state":
			baseDest = append(baseDest, &user.State)
		case "$city":
			baseDest = append(baseDest, &user.City)
		case "$timezone":
			baseDest = append(baseDest, &user.Timezone)
		case "$first_event_at":
			baseDest = append(baseDest, &user.FirstEventAt)
		case "$sdk_edition":
			baseDest = append(baseDest, &user.SDKEdition)
		case "$sdk_version":
			baseDest = append(baseDest, &user.SDKVersion)
		case "$current_url":
			baseDest = append(baseDest, &user.CurrentUrl)
		case "$initial_referrer":
			baseDest = append(baseDest, &user.InitialReferrer)
		case "$referring_domain":
			baseDest = append(baseDest, &user.ReferringDomain)
		case "initial_utm_source":
			baseDest = append(baseDest, &user.InitialUtmSource)
		case "initial_utm_medium":
			baseDest = append(baseDest, &user.InitialUtmMedium)
		case "initial_utm_campaign":
			baseDest = append(baseDest, &user.InitialUtmCampaign)
		case "properties":
			baseDest = append(baseDest, &user.PropertiesRaw)
		case "group_id1":
			baseDest = append(baseDest, &user.GroupID1)
		case "group_id2":
			baseDest = append(baseDest, &user.GroupID2)
		case "group_id3":
			baseDest = append(baseDest, &user.GroupID3)
		case "group_id4":
			baseDest = append(baseDest, &user.GroupID4)
		case "group_id5":
			baseDest = append(baseDest, &user.GroupID5)
		case "group_id6":
			baseDest = append(baseDest, &user.GroupID6)
		case "$or_api_endpoint":
			baseDest = append(baseDest, &user.OrAPIEndpoint)
		default:
			var dummy string
			baseDest = append(baseDest, &dummy)
		}
	}

	return baseDest
}

func (u *usersImpl) UpdateUser(projID uint32, user *model.User) (*model.User, error) {
	return nil, errors.New("not implemented")
}

func (u *usersImpl) DeleteUser(projID uint32, userID uint32) (*model.User, error) {
	return nil, errors.New("not implemented")
}
