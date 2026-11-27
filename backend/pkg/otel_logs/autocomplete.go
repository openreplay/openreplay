package otel_logs

import (
	"context"
	"strings"

	"openreplay/backend/pkg/analytics/filters"
)

const (
	autocompleteLimit = 20
	// attributes with more distinct values than this are not offered as facets
	facetMaxDistinctValues = 500
	facetMaxkeys           = 100
)

// autocompleteSources maps the request source to the Source enum of
// otel.logs_attribute_values; its AttributeKey column holds the bare column
// name or attribute key.
var autocompleteSources = map[string]string{
	"":           "log_global",
	"log_global": "log_global",
	"log":        "log",
	"resource":   "resource",
	"scope":      "scope",
}

var likeEscaper = strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`)

// Autocomplete suggests the most frequent values of one property that start
// with q. An empty source targets the native columns (ServiceName, ScopeName,
// ...); log / resource / scope target the attribute with that key.
func (l *logsImpl) Autocomplete(ctx context.Context, projectID uint32, propertyName, source, q string) ([]ValueCount, error) {
	src, ok := autocompleteSources[source]
	if !ok {
		return nil, invalid("unknown source %q", source)
	}
	if propertyName == "" || len(propertyName) > maxKeyLength {
		return nil, invalid("propertyName must be 1..%d characters", maxKeyLength)
	}
	if src != "log_global" && strings.HasPrefix(propertyName, internalKeyPrefix) {
		return nil, invalid("attribute key %q is reserved", propertyName)
	}
	if len(q) > maxQueryLength {
		return nil, invalid("q must not exceed %d characters", maxQueryLength)
	}

	qp := filters.NewParams()
	qp.Set("projectId", projectID)
	qp.Set("source", src)
	qp.Set("key", propertyName)
	qp.Set("limit", autocompleteLimit)
	where := "ProjectId = @projectId AND Source = @source AND AttributeKey = @key"
	if q != "" {
		qp.Set("q", likeEscaper.Replace(q)+"%")
		where += " AND AttributeValue LIKE @q"
	}
	query := `
		SELECT AttributeValue, sum(Count) AS Occurrences
		FROM otel.logs_attribute_values
		WHERE ` + where + `
		GROUP BY AttributeValue
		ORDER BY Occurrences DESC
		LIMIT @limit`
	return l.valueCounts(facetContext(ctx), query, qp)
}

// FacetsList returns the attributes of a project that have few enough distinct
// values to be offered as facets, most diverse first.
func (l *logsImpl) FacetsList(ctx context.Context, projectID uint32) ([]Facet, error) {
	qp := filters.NewParams()
	qp.Set("projectId", projectID)
	qp.Set("internalKeyPrefix", internalKeyPrefix)
	qp.Set("maxDistinct", facetMaxDistinctValues)
	qp.Set("maxkeys", facetMaxkeys)
	query := `
		SELECT toString(Source),
		       toString(AttributeKey),
		       uniq(AttributeValue) AS DistinctValues
		FROM otel.logs_attribute_values
		WHERE ProjectId = @projectId
		  AND NOT startsWith(AttributeKey, @internalKeyPrefix)
		GROUP BY Source, AttributeKey
		HAVING DistinctValues < @maxDistinct
		ORDER BY DistinctValues DESC
		LIMIT @maxkeys`

	rows, err := l.conn.Query(facetContext(ctx), query, qp.Args()...)
	if err != nil {
		return nil, wrapErr(err)
	}
	defer rows.Close()
	out := make([]Facet, 0)
	for rows.Next() {
		var f Facet
		if err := rows.Scan(&f.Source, &f.Key, &f.DistinctValues); err != nil {
			return nil, err
		}
		out = append(out, f)
	}
	return out, wrapErr(rows.Err())
}
