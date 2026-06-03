package filters_catalog

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"

	"openreplay/backend/pkg/analytics/filters_catalog/model"
)

const autocompleteCacheTTL = 180 * time.Second

var multiSpaceRe = regexp.MustCompile(` +`)

func stringToSQLLike(value string) string {
	value = multiSpaceRe.ReplaceAllString(value, " ")
	value = strings.ReplaceAll(value, "*", "%")
	if strings.HasPrefix(value, "^") {
		value = value[1:]
	} else if !strings.HasPrefix(value, "%") {
		value = "%" + value
	}
	if strings.HasSuffix(value, "$") {
		value = value[:len(value)-1]
	} else if !strings.HasSuffix(value, "%") {
		value = value + "%"
	}
	return value
}

func scanAutocompleteRows(rows driver.Rows) ([]model.AutocompleteRow, error) {
	defer rows.Close()
	out := make([]model.AutocompleteRow, 0)
	for rows.Next() {
		var r model.AutocompleteRow
		if err := rows.Scan(&r.Value, &r.RowPercentage); err != nil {
			return nil, fmt.Errorf("scan autocomplete row: %w", err)
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

func (s *filtersCatalogImpl) SearchEventsAutocomplete(ctx context.Context, projectID uint32, q string) ([]model.AutocompleteRow, error) {
	cacheKey := fmt.Sprintf("events|%d|%s", projectID, q)
	if rows, ok := s.acCache.get(cacheKey); ok {
		return rows, nil
	}

	constraints := []string{"project_id = ?"}
	args := []any{projectID}
	if q != "" {
		constraints = append(constraints, "value ILIKE ?")
		args = append(args, stringToSQLLike(q))
	}
	query := fmt.Sprintf(`
SELECT value,
       truncate(row_count * 100 / SUM(row_count) OVER (), 2) AS row_percentage
FROM (SELECT value,
             sumMerge(data_count) OVER () AS row_count
      FROM product_analytics.autocomplete_events_grouped
      WHERE %s
      ORDER BY row_count DESC
      LIMIT 20) AS raw`, strings.Join(constraints, " AND "))

	rows, err := s.ch.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("ch query autocomplete events: %w", err)
	}
	result, err := scanAutocompleteRows(rows)
	if err != nil {
		return nil, err
	}
	s.acCache.set(cacheKey, result)
	return result, nil
}

func (s *filtersCatalogImpl) SearchPropertiesAutocomplete(ctx context.Context, projectID uint32, propertyName, eventName, userID, source, q string, autoCaptured bool) ([]model.AutocompleteRow, error) {
	scope := resolveAutocompleteScope(source, propertyName)

	if autoCaptured {
		propertyName = keyToSnakeCase(propertyName)
	}

	_, usersSimple := UsersSimpleProperties[propertyName]
	_, eventsSimple := EventsSimpleProperties[propertyName]
	switch {
	case scope == "sessions",
		scope == "users" && usersSimple,
		scope == "events" && eventsSimple:
		return s.searchSimpleProperty(ctx, projectID, propertyName, scope, q)
	case scope == "users":
		return s.searchUsersProperties(ctx, projectID, propertyName, userID, q)
	default:
		return s.searchEventsProperties(ctx, projectID, propertyName, eventName, q)
	}
}

func resolveAutocompleteScope(source, propertyName string) string {
	switch source {
	case "session", "sessions", "metadata", "metadatas":
		return "sessions"
	case "user", "users":
		if !strings.HasPrefix(propertyName, "$") {
			return "sessions"
		}
		return "users"
	case "event", "events":
		return "events"
	}
	return ""
}

func (s *filtersCatalogImpl) searchSimpleProperty(ctx context.Context, projectID uint32, name, source, q string) ([]model.AutocompleteRow, error) {
	cacheKey := fmt.Sprintf("simple|%d|%s|%s|%s", projectID, name, source, q)
	if rows, ok := s.acCache.get(cacheKey); ok {
		return rows, nil
	}

	constraints := []string{
		"project_id = ?",
		"_timestamp >= now()-INTERVAL 1 MONTH",
		"name = ?",
		"source = ?",
	}
	args := []any{projectID, name, source}
	if q != "" {
		constraints = append(constraints, "value ILIKE ?")
		args = append(args, stringToSQLLike(q))
	}
	query := fmt.Sprintf(`
SELECT value, truncate(100 * row_count / sum(row_count) OVER (), 2) AS row_percentage
FROM (SELECT value, sumMerge(data_count) AS row_count
      FROM product_analytics.autocomplete_simple
      WHERE %s
      GROUP BY 1) AS raw
ORDER BY row_count DESC
LIMIT 20`, strings.Join(constraints, " AND "))

	rows, err := s.ch.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("ch query autocomplete simple: %w", err)
	}
	result, err := scanAutocompleteRows(rows)
	if err != nil {
		return nil, err
	}
	s.acCache.set(cacheKey, result)
	return result, nil
}

func (s *filtersCatalogImpl) searchUsersProperties(ctx context.Context, projectID uint32, propertyName, userID, q string) ([]model.AutocompleteRow, error) {
	constraints := []string{"project_id = ?", "property_name = ?"}
	args := []any{projectID, propertyName}
	if userID != "" {
		constraints = append(constraints, "user_id = ?")
		args = append(args, userID)
	}
	if q != "" {
		constraints = append(constraints, "value ILIKE ?")
		args = append(args, stringToSQLLike(q))
	}
	query := fmt.Sprintf(`
SELECT value,
       truncate(row_count * 100 / sum(row_count) OVER (), 2) AS row_percentage
FROM (SELECT value,
             sumMerge(data_count) AS row_count
      FROM product_analytics.autocomplete_user_properties_grouped
      WHERE %s
      GROUP BY 1
      ORDER BY row_count DESC
      LIMIT 20) AS raw`, strings.Join(constraints, " AND "))

	rows, err := s.ch.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("ch query autocomplete user properties: %w", err)
	}
	return scanAutocompleteRows(rows)
}

func (s *filtersCatalogImpl) searchEventsProperties(ctx context.Context, projectID uint32, propertyName, eventName, q string) ([]model.AutocompleteRow, error) {
	constraints := []string{"project_id = ?", "property_name = ?"}
	args := []any{projectID, propertyName}
	if eventName != "" {
		constraints = append(constraints, "event_name = ?")
		args = append(args, eventName)
	}
	if q != "" {
		constraints = append(constraints, "value ILIKE ?")
		args = append(args, stringToSQLLike(q))
	}
	query := fmt.Sprintf(`
SELECT value,
       truncate(row_count * 100 / sum(row_count) OVER (), 2) AS row_percentage
FROM (SELECT value,
             sumMerge(data_count) AS row_count
      FROM product_analytics.autocomplete_event_properties_grouped
      WHERE %s
      GROUP BY 1
      ORDER BY row_count DESC
      LIMIT 20) AS raw`, strings.Join(constraints, " AND "))

	rows, err := s.ch.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("ch query autocomplete event properties: %w", err)
	}
	out, err := scanAutocompleteRows(rows)
	if err != nil {
		return nil, err
	}
	if eventName == "ISSUE" && propertyName == "issue_type" {
		for i := range out {
			out[i].Name = issueTypeName(out[i].Value)
		}
	}
	return out, nil
}

func issueTypeName(value string) string {
	for _, it := range IssueTypes {
		if it.Type == value {
			return it.Name
		}
	}
	return keyToTitleCase(value)
}

func keyToTitleCase(name string) string {
	parts := strings.Split(keyToSnakeCase(name), "_")
	words := make([]string, 0, len(parts))
	for _, p := range parts {
		if p == "" {
			continue
		}
		words = append(words, strings.ToUpper(p[:1])+strings.ToLower(p[1:]))
	}
	return strings.Join(words, " ")
}
