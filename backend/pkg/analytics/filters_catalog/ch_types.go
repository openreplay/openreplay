// backend/pkg/analytics/filters_catalog/ch_types.go
package filters_catalog

import (
	"regexp"
	"strings"
)

var (
	chWrapperRE = regexp.MustCompile(`^(Nullable|LowCardinality)\((.*)\)$`)
	chIntRE     = regexp.MustCompile(`^u?int(8|16|32|64|128|256)$`)
	chFloatRE   = regexp.MustCompile(`^(float(32|64)|double)$`)
)

// SimplifyClickHouseType — port of exp_ch_helper.simplify_clickhouse_type.
func SimplifyClickHouseType(t string) string {
	for {
		m := chWrapperRE.FindStringSubmatch(t)
		if m == nil {
			break
		}
		t = m[2]
	}
	n := strings.ToLower(t)
	switch {
	case chIntRE.MatchString(n):
		return "int"
	case chFloatRE.MatchString(n):
		return "float"
	case strings.HasPrefix(n, "decimal"):
		return "float"
	case strings.HasPrefix(n, "datetime"):
		return "datetime"
	case strings.HasPrefix(n, "date"):
		return "datetime"
	case strings.HasPrefix(n, "fixedstring"):
		return "string"
	case strings.HasPrefix(n, "string"):
		return "string"
	case strings.HasPrefix(n, "uuid"):
		return "string"
	case strings.HasPrefix(n, "enum8"), strings.HasPrefix(n, "enum16"):
		return "string"
	case strings.HasPrefix(n, "array"):
		return "array"
	case strings.HasPrefix(n, "tuple"):
		return "tuple"
	case strings.HasPrefix(n, "map"):
		return "map"
	case strings.HasPrefix(n, "nested"):
		return "nested"
	}
	return n
}

// SimplifyClickHouseTypes returns the deduplicated set of simplified types.
// Order is not guaranteed (matches Python `list(set(...))`).
func SimplifyClickHouseTypes(types []string) []string {
	seen := make(map[string]struct{}, len(types))
	out := make([]string, 0, len(types))
	for _, t := range types {
		s := SimplifyClickHouseType(t)
		if _, ok := seen[s]; !ok {
			seen[s] = struct{}{}
			out = append(out, s)
		}
	}
	return out
}
