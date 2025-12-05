package users

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"

	"openreplay/backend/pkg/analytics/filters"
	"openreplay/backend/pkg/analytics/users/model"
	"openreplay/backend/pkg/logger"
)

type Users interface {
	GetByUserID(ctx context.Context, projID uint32, userId string) (*model.User, error)
	SearchUsers(ctx context.Context, projID uint32, req *model.SearchUsersRequest) (*model.SearchUsersResponse, error)
	UpdateUser(ctx context.Context, projID uint32, user *model.User) (*model.User, error)
	DeleteUser(ctx context.Context, projID uint32, userID string) error
	GetUserActivity(ctx context.Context, projID uint32, userID string, req *model.UserActivityRequest) (*model.UserActivityResponse, error)
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

func (u *usersImpl) GetByUserID(ctx context.Context, projID uint32, userId string) (*model.User, error) {
	query := `
		WITH latest_user AS (
			SELECT *
			FROM product_analytics.users
			WHERE project_id = ? AND "$user_id" = ?
			ORDER BY _timestamp DESC
			LIMIT 1
		)
		SELECT 
			project_id, "$user_id", "$email", "$name", "$first_name", "$last_name", "$phone", "$avatar",
			toInt64(toUnixTimestamp("$created_at") * 1000) AS created_at, toString(properties) AS properties, group_id1, group_id2, group_id3, group_id4, group_id5, group_id6,
			"$sdk_edition", "$sdk_version", "$current_url", "$initial_referrer", "$referring_domain",
			initial_utm_source, initial_utm_medium, initial_utm_campaign, "$country", "$state", "$city",
			"$or_api_endpoint", "$timezone", toInt64(toUnixTimestamp("$first_event_at") * 1000) AS first_event_at, toInt64(toUnixTimestamp("$last_seen") * 1000) AS last_seen,
			(SELECT arraySort(groupUniqArray(distinct_id)) 
			 FROM product_analytics.users_distinct_id 
			 WHERE project_id = ? AND "$user_id" = ? AND _deleted_at = '1970-01-01 00:00:00') AS distinct_ids
		FROM latest_user
		WHERE _deleted_at = '1970-01-01 00:00:00'`

	row := u.chConn.QueryRow(ctx, query, projID, userId, projID, userId)

	user := &model.User{}
	err := row.Scan(
		&user.ProjectID, &user.UserID, &user.Email, &user.Name, &user.FirstName, &user.LastName,
		&user.Phone, &user.Avatar, &user.CreatedAt, &user.PropertiesRaw, &user.GroupID1, &user.GroupID2,
		&user.GroupID3, &user.GroupID4, &user.GroupID5, &user.GroupID6, &user.SDKEdition, &user.SDKVersion,
		&user.CurrentUrl, &user.InitialReferrer, &user.ReferringDomain, &user.InitialUtmSource,
		&user.InitialUtmMedium, &user.InitialUtmCampaign, &user.Country, &user.State, &user.City,
		&user.OrAPIEndpoint, &user.Timezone, &user.FirstEventAt, &user.LastSeen, &user.DistinctIDs,
	)
	if err != nil {
		u.log.Error(ctx, "failed to get user by ID: %v", err)
		return nil, fmt.Errorf("failed to get user by ID: %w", err)
	}

	if err := user.UnmarshalProperties(); err != nil {
		u.log.Error(ctx, "failed to unmarshal properties: %v", err)
		return nil, fmt.Errorf("failed to unmarshal properties: %w", err)
	}

	return user, nil
}

func (u *usersImpl) SearchUsers(ctx context.Context, projID uint32, req *model.SearchUsersRequest) (*model.SearchUsersResponse, error) {
	if req.Limit == 0 {
		req.Limit = filters.DefaultLimit
	}
	if req.Page == 0 {
		req.Page = filters.DefaultPage
	}

	offset := filters.CalculateOffset(req.Page, req.Limit)
	columnsStr := filters.ConvertColumnsToStrings(req.Columns)

	whereClause, params := u.buildSearchQueryParams(projID, req)
	selectColumns := BuildSelectColumns("latest_users", columnsStr)
	sortBy := filters.ValidateSortColumnGeneric(string(req.SortBy), model.ColumnMapping, `"$user_id"`)
	sortOrder := filters.ValidateSortOrder(string(req.SortOrder))

	query := fmt.Sprintf(`
		WITH latest_users AS (
			SELECT *
			FROM product_analytics.users
			WHERE %s
			ORDER BY _timestamp DESC
			LIMIT 1 BY project_id, "$user_id"
		)
		SELECT COUNT(*) OVER() as total_count, %s
		FROM latest_users
		WHERE _deleted_at = '1970-01-01 00:00:00'
		ORDER BY %s %s
		LIMIT ? OFFSET ?`,
		whereClause, strings.Join(selectColumns, ", "), sortBy, sortOrder)

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
		scanDest := u.getScanDestinations(&user, columnsStr)

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

	return &model.SearchUsersResponse{
		Total: total,
		Users: users,
	}, nil
}

func (u *usersImpl) buildSearchQueryParams(projID uint32, req *model.SearchUsersRequest) (string, []interface{}) {
	baseConditions := []string{
		"project_id = ?",
	}
	params := []interface{}{projID}

	if req.Query != "" {
		queryPattern := "%" + req.Query + "%"
		queryCondition := `("$user_id" ILIKE ? OR "$email" ILIKE ? OR "$name" ILIKE ?)`
		baseConditions = append(baseConditions, queryCondition)
		params = append(params, queryPattern, queryPattern, queryPattern)
	}

	filterConditions, filterParams := filters.BuildSimpleFilterQuery("", req.Filters, model.ColumnMapping, "properties")
	whereClause := filters.BuildWhereClause(baseConditions, filterConditions)
	params = append(params, filterParams...)

	return whereClause, params
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
		if col == string(filters.UserColumnUserID) || col == string(filters.UserColumnEmail) || col == string(filters.UserColumnName) ||
			col == string(filters.UserColumnFirstName) || col == string(filters.UserColumnLastName) ||
			col == string(filters.UserColumnCreatedAt) || col == string(filters.UserColumnLastSeen) || col == "project_id" {
			continue
		}
		if ptr := model.GetFieldPointer(user, col); ptr != nil {
			baseDest = append(baseDest, ptr)
		} else {
			var dummy string
			baseDest = append(baseDest, &dummy)
		}
	}

	return baseDest
}

func (u *usersImpl) UpdateUser(ctx context.Context, projID uint32, user *model.User) (*model.User, error) {
	if user.UserID == "" {
		return nil, errors.New("user_id is required")
	}

	existingUser, err := u.GetByUserID(ctx, projID, user.UserID)
	if err != nil {
		u.log.Error(ctx, "user not found: %v", err)
		return nil, fmt.Errorf("user not found: %w", err)
	}

	if user.Email != "" {
		existingUser.Email = user.Email
	}
	if user.Name != "" {
		existingUser.Name = user.Name
	}
	if user.FirstName != "" {
		existingUser.FirstName = user.FirstName
	}
	if user.LastName != "" {
		existingUser.LastName = user.LastName
	}
	if user.Phone != "" {
		existingUser.Phone = user.Phone
	}
	if user.Avatar != "" {
		existingUser.Avatar = user.Avatar
	}
	if user.Properties != nil {
		existingUser.Properties = user.Properties
	}
	if len(user.GroupID1) > 0 {
		existingUser.GroupID1 = user.GroupID1
	}
	if len(user.GroupID2) > 0 {
		existingUser.GroupID2 = user.GroupID2
	}
	if len(user.GroupID3) > 0 {
		existingUser.GroupID3 = user.GroupID3
	}
	if len(user.GroupID4) > 0 {
		existingUser.GroupID4 = user.GroupID4
	}
	if len(user.GroupID5) > 0 {
		existingUser.GroupID5 = user.GroupID5
	}
	if len(user.GroupID6) > 0 {
		existingUser.GroupID6 = user.GroupID6
	}
	if user.Country != "" {
		existingUser.Country = user.Country
	}
	if user.State != "" {
		existingUser.State = user.State
	}
	if user.City != "" {
		existingUser.City = user.City
	}
	if user.Timezone != 0 {
		existingUser.Timezone = user.Timezone
	}

	if existingUser.Properties != nil {
		propJSON, err := filters.MarshalJSONProperties(existingUser.Properties)
		if err != nil {
			u.log.Error(ctx, "failed to marshal properties: %v", err)
			return nil, fmt.Errorf("failed to marshal properties: %w", err)
		}
		existingUser.PropertiesRaw = &propJSON
	}

	query := `INSERT INTO product_analytics.users`

	batch, err := u.chConn.PrepareBatch(ctx, query)
	if err != nil {
		u.log.Error(ctx, "failed to prepare batch: %v", err)
		return nil, fmt.Errorf("failed to prepare batch: %w", err)
	}

	propertiesValue := "{}"
	if existingUser.PropertiesRaw != nil && *existingUser.PropertiesRaw != "" {
		propertiesValue = *existingUser.PropertiesRaw
	}

	createdAt := time.Unix(0, existingUser.CreatedAt*1000000)
	firstEventAt := time.Unix(0, existingUser.FirstEventAt*1000000)
	lastSeen := time.Unix(0, existingUser.LastSeen*1000000)
	deletedAt := time.Date(1970, 1, 1, 0, 0, 0, 0, time.UTC)

	err = batch.Append(
		projID,
		existingUser.UserID,
		existingUser.Email,
		existingUser.Name,
		existingUser.FirstName,
		existingUser.LastName,
		existingUser.Phone,
		existingUser.Avatar,
		createdAt,
		propertiesValue,
		existingUser.GroupID1,
		existingUser.GroupID2,
		existingUser.GroupID3,
		existingUser.GroupID4,
		existingUser.GroupID5,
		existingUser.GroupID6,
		existingUser.SDKEdition,
		existingUser.SDKVersion,
		existingUser.CurrentUrl,
		existingUser.InitialReferrer,
		existingUser.ReferringDomain,
		existingUser.InitialUtmSource,
		existingUser.InitialUtmMedium,
		existingUser.InitialUtmCampaign,
		existingUser.Country,
		existingUser.State,
		existingUser.City,
		existingUser.OrAPIEndpoint,
		existingUser.Timezone,
		firstEventAt,
		lastSeen,
		deletedAt,
		uint8(0),
		time.Now(),
	)
	if err != nil {
		u.log.Error(ctx, "failed to append to batch: %v", err)
		return nil, fmt.Errorf("failed to append to batch: %w", err)
	}

	err = batch.Send()
	if err != nil {
		u.log.Error(ctx, "failed to send batch: %v", err)
		return nil, fmt.Errorf("failed to send batch: %w", err)
	}

	return u.GetByUserID(ctx, projID, existingUser.UserID)
}

func (u *usersImpl) DeleteUser(ctx context.Context, projID uint32, userID string) error {
	if userID == "" {
		return errors.New("user_id is required")
	}

	existingUser, err := u.GetByUserID(ctx, projID, userID)
	if err != nil {
		u.log.Error(ctx, "user not found: %v", err)
		return fmt.Errorf("user not found: %w", err)
	}

	now := time.Now()
	query := `INSERT INTO product_analytics.users`

	batch, err := u.chConn.PrepareBatch(ctx, query)
	if err != nil {
		u.log.Error(ctx, "failed to prepare batch: %v", err)
		return fmt.Errorf("failed to prepare batch: %w", err)
	}

	propertiesValue := "{}"
	if existingUser.PropertiesRaw != nil && *existingUser.PropertiesRaw != "" {
		propertiesValue = *existingUser.PropertiesRaw
	}

	createdAt := time.Unix(0, existingUser.CreatedAt*1000000)
	firstEventAt := time.Unix(0, existingUser.FirstEventAt*1000000)
	lastSeen := time.Unix(0, existingUser.LastSeen*1000000)

	err = batch.Append(
		projID,
		existingUser.UserID,
		existingUser.Email,
		existingUser.Name,
		existingUser.FirstName,
		existingUser.LastName,
		existingUser.Phone,
		existingUser.Avatar,
		createdAt,
		propertiesValue,
		existingUser.GroupID1,
		existingUser.GroupID2,
		existingUser.GroupID3,
		existingUser.GroupID4,
		existingUser.GroupID5,
		existingUser.GroupID6,
		existingUser.SDKEdition,
		existingUser.SDKVersion,
		existingUser.CurrentUrl,
		existingUser.InitialReferrer,
		existingUser.ReferringDomain,
		existingUser.InitialUtmSource,
		existingUser.InitialUtmMedium,
		existingUser.InitialUtmCampaign,
		existingUser.Country,
		existingUser.State,
		existingUser.City,
		existingUser.OrAPIEndpoint,
		existingUser.Timezone,
		firstEventAt,
		lastSeen,
		now,
		uint8(1),
		now,
	)
	if err != nil {
		u.log.Error(ctx, "failed to append to batch: %v", err)
		return fmt.Errorf("failed to append to batch: %w", err)
	}

	err = batch.Send()
	if err != nil {
		u.log.Error(ctx, "failed to send batch: %v", err)
		return fmt.Errorf("failed to send batch: %w", err)
	}

	return nil
}

func (u *usersImpl) GetUserActivity(ctx context.Context, projID uint32, userID string, req *model.UserActivityRequest) (*model.UserActivityResponse, error) {
	if userID == "" {
		return nil, errors.New("user_id is required")
	}

	if req.Limit == 0 {
		req.Limit = filters.DefaultLimit
	}
	if req.Page == 0 {
		req.Page = filters.DefaultPage
	}

	offset := filters.CalculateOffset(req.Page, req.Limit)

	sortBy := req.SortBy
	if sortBy == "" {
		sortBy = "created_at"
	}

	if sortBy == "$event_name" {
		sortBy = `"$event_name"`
	} else {
		sortBy = "created_at"
	}

	sortOrder := filters.ValidateSortOrder(string(req.SortOrder))

	baseConditions := []string{
		"e.project_id = ?",
		`e."$user_id" = ?`,
		"e.created_at >= toDateTime64(?/1000, 3)",
		"e.created_at <= toDateTime64(?/1000, 3)",
	}
	params := []interface{}{projID, userID, req.StartDate, req.EndDate}

	if len(req.HideEvents) > 0 {
		placeholders := make([]string, len(req.HideEvents))
		for i := range req.HideEvents {
			placeholders[i] = "?"
			params = append(params, req.HideEvents[i])
		}
		baseConditions = append(baseConditions, fmt.Sprintf(`e."$event_name" NOT IN (%s)`, strings.Join(placeholders, ", ")))
	}

	whereClause := strings.Join(baseConditions, " AND ")

	query := fmt.Sprintf(`
		SELECT COUNT(*) OVER() as total_count,
			e.event_id,
			e."$event_name",
			toInt64(toUnixTimestamp(e.created_at) * 1000) AS created_at
		FROM product_analytics.events AS e
		WHERE %s
		ORDER BY e.%s %s
		LIMIT ? OFFSET ?`,
		whereClause, sortBy, sortOrder)

	queryParams := append(params, req.Limit, offset)

	rows, err := u.chConn.Query(ctx, query, queryParams...)
	if err != nil {
		u.log.Error(ctx, "failed to query user activity: %v", err)
		return nil, fmt.Errorf("failed to query user activity: %w", err)
	}
	defer rows.Close()

	var total uint64
	var events []model.UserEvent
	for rows.Next() {
		event := model.UserEvent{}

		if err := rows.Scan(
			&total,
			&event.EventID,
			&event.EventName,
			&event.CreatedAt,
		); err != nil {
			u.log.Error(ctx, "failed to scan event row: %v", err)
			return nil, fmt.Errorf("failed to scan event row: %w", err)
		}

		events = append(events, event)
	}

	if err := rows.Err(); err != nil {
		u.log.Error(ctx, "error iterating event rows: %v", err)
		return nil, fmt.Errorf("error iterating event rows: %w", err)
	}

	return &model.UserActivityResponse{
		Total:  total,
		Events: events,
	}, nil
}
