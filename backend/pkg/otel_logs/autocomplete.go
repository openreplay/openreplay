package otel_logs

import (
	"context"
	"regexp"
	"strings"

	"openreplay/backend/pkg/analytics/filters"
)

const (
	autocompleteLimit    = 20
	autocompleteTopLimit = 10 // no search query: just the most frequent values
)

var multiSpaceRe = regexp.MustCompile(` +`)

// autocompleteSources maps the request source to the Source enum of
// otel.autocomplete_grouped; its Name column holds the bare column name or
// attribute key.
var autocompleteSources = map[string]string{
	"":           "log_global",
	"log_global": "log_global",
	"log":        "log",
	"resource":   "resource",
	"scope":      "scope",
}

// stringToSQLLike mirrors the filters catalog autocomplete: "*" is a wildcard,
// "^" / "$" anchor the start / end, otherwise the value matches anywhere.
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

// Autocomplete suggests values of one property. An empty source targets the
// native columns (ServiceName, ScopeName, ...); log / resource / scope target
// the attribute with that key.
func (l *logsImpl) Autocomplete(ctx context.Context, projectID uint32, propertyName, source, q string) ([]AutocompleteRow, error) {
	src, ok := autocompleteSources[source]
	if !ok {
		return nil, invalid("unknown source %q", source)
	}
	if propertyName == "" || len(propertyName) > maxKeyLength {
		return nil, invalid("propertyName must be 1..%d characters", maxKeyLength)
	}
	if source != "" && strings.HasPrefix(propertyName, internalKeyPrefix) {
		return nil, invalid("attribute key %q is reserved", propertyName)
	}
	if len(q) > maxQueryLength {
		return nil, invalid("q must not exceed %d characters", maxQueryLength)
	}

	qp := filters.NewParams()
	qp.Set("projectId", projectID)
	qp.Set("source", src)
	qp.Set("name", propertyName)
	where := "ProjectId = @projectId AND Source = @source AND Name = @name"
	if q == "" {
		qp.Set("limit", autocompleteTopLimit)
	} else {
		qp.Set("limit", autocompleteLimit)
		qp.Set("q", stringToSQLLike(q))
		where += " AND Value ILIKE @q"
	}
	query := `
		SELECT Value,
		       truncate(row_count * 100 / sum(row_count) OVER (), 2) AS row_percentage
		FROM (SELECT Value,
		             sumMerge(DataCount) AS row_count
		      FROM otel.autocomplete_grouped
		      WHERE ` + where + `
		      GROUP BY 1
		      ORDER BY row_count DESC
		      LIMIT @limit) AS raw`

	rows, err := l.conn.Query(facetContext(ctx), query, qp.Args()...)
	if err != nil {
		return nil, wrapErr(err)
	}
	defer rows.Close()
	out := make([]AutocompleteRow, 0)
	for rows.Next() {
		var r AutocompleteRow
		if err := rows.Scan(&r.Value, &r.RowPercentage); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, wrapErr(rows.Err())
}
