package otel_logs

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"openreplay/backend/pkg/analytics/filters"
)

const (
	maxRange          = 30 * 24 * time.Hour
	maxQueryLength    = 500
	maxListValues     = 50
	maxAttributes     = 20
	maxKeyLength      = 256
	defaultLimit      = 100
	maxLimit          = 500
	maxTokensPerCheck = 64
	histogramBuckets  = 60
	facetLimit        = 50
	facetSampleRows   = 3_000_000
	internalKeyPrefix = "openreplay."
)

var (
	windowSizes    = []time.Duration{15 * time.Minute, 6 * time.Hour, 6 * time.Hour, 12 * time.Hour, 24 * time.Hour}
	histogramSteps = []int64{15, 30, 60, 300, 900, 1800, 3600, 7200, 21600, 43200, 86400}
)

type ValidationError struct{ msg string }

func (e *ValidationError) Error() string { return e.msg }

func invalid(format string, args ...any) error {
	return &ValidationError{msg: fmt.Sprintf(format, args...)}
}

func IsValidationError(err error) bool {
	var v *ValidationError
	return errors.As(err, &v)
}

func (f *Filter) validate() error {
	if f.StartTime <= 0 || f.EndTime <= f.StartTime {
		return invalid("startTime must be positive and less than endTime")
	}
	if time.Duration(f.EndTime-f.StartTime)*time.Millisecond > maxRange {
		return invalid("time range must not exceed %d days", int(maxRange.Hours()/24))
	}
	if len(f.Query) > maxQueryLength {
		return invalid("query must not exceed %d characters", maxQueryLength)
	}
	if len(f.Services) > maxListValues || len(f.Severities) > maxListValues {
		return invalid("services and severities accept at most %d values", maxListValues)
	}
	if len(f.Attributes) > maxAttributes {
		return invalid("at most %d attribute conditions are allowed", maxAttributes)
	}
	for i := range f.Severities {
		f.Severities[i] = strings.ToLower(f.Severities[i])
	}
	for _, a := range f.Attributes {
		if err := validateScopeKey(a.Scope, a.Key); err != nil {
			return err
		}
		switch a.Op {
		case "exists":
		case "is", "isNot", "contains":
			if len(a.Values) == 0 || len(a.Values) > maxListValues {
				return invalid("attribute %q needs between 1 and %d values", a.Key, maxListValues)
			}
		default:
			return invalid("unknown attribute op %q", a.Op)
		}
	}
	return nil
}

func validateScopeKey(scope, key string) error {
	if scope != "log" && scope != "resource" {
		return invalid("unknown attribute scope %q", scope)
	}
	if key == "" || len(key) > maxKeyLength {
		return invalid("attribute key must be 1..%d characters", maxKeyLength)
	}
	if strings.HasPrefix(key, internalKeyPrefix) {
		return invalid("attribute key %q is reserved", key)
	}
	return nil
}

func attributeColumns(scope string) (mapColumn, itemsColumn string) {
	if scope == "resource" {
		return "ResourceAttributes", "ResourceAttributeItems"
	}
	return "LogAttributes", "LogAttributeItems"
}

type exclusion struct {
	services   bool
	severities bool
	attrScope  string
	attrKey    string
}

func buildConditions(projectID uint32, f *Filter, startMs, endMs int64, ex exclusion, qp *filters.Params) string {
	qp.Set("projectId", projectID)
	qp.Set("startMs", startMs)
	qp.Set("endMs", endMs)
	conds := []string{
		"ProjectId = @projectId",
		"Timestamp >= fromUnixTimestamp64Milli(@startMs)",
		"Timestamp < fromUnixTimestamp64Milli(@endMs)",
	}
	if len(f.Services) > 0 && !ex.services {
		conds = append(conds, "ServiceName IN "+qp.Add(filters.GroupSetOf(f.Services)))
	}
	if len(f.Severities) > 0 && !ex.severities {
		conds = append(conds, "SeverityText IN "+qp.Add(filters.GroupSetOf(f.Severities)))
	}
	for _, a := range f.Attributes {
		if a.Scope == ex.attrScope && a.Key == ex.attrKey {
			continue
		}
		conds = append(conds, attributeCondition(a, qp))
	}
	conds = append(conds, textConditions(f.Query, qp)...)
	return strings.Join(conds, " AND ")
}

func attributeCondition(a AttributeFilter, qp *filters.Params) string {
	mapCol, itemsCol := attributeColumns(a.Scope)
	switch a.Op {
	case "exists":
		return fmt.Sprintf("mapContains(%s, %s)", mapCol, qp.Add(a.Key))
	case "contains":
		key := qp.Add(a.Key)
		return fmt.Sprintf("(mapContains(%s, %s) AND multiSearchAnyCaseInsensitiveUTF8(%s[%s], %s))",
			mapCol, key, mapCol, key, qp.Add(a.Values))
	}
	items := make([]string, len(a.Values))
	for i, v := range a.Values {
		items[i] = a.Key + "=" + v
	}
	cond := fmt.Sprintf("hasAny(%s, %s)", itemsCol, qp.Add(items))
	if a.Op == "isNot" {
		return "NOT " + cond
	}
	return cond
}

// Mirrors the splitByNonAlpha tokenizer and ASCII-only lower() behind idx_lower_body.
func tokenize(s string) []string {
	var tokens []string
	start := -1
	for i := 0; i <= len(s); i++ {
		if i < len(s) && !isASCIISeparator(s[i]) {
			if start < 0 {
				start = i
			}
			continue
		}
		if start >= 0 {
			tokens = append(tokens, asciiLower(s[start:i]))
			start = -1
		}
	}
	return tokens
}

func isASCIISeparator(b byte) bool {
	if b >= 0x80 {
		return false
	}
	return !(b >= 'a' && b <= 'z' || b >= 'A' && b <= 'Z' || b >= '0' && b <= '9')
}

func asciiLower(s string) string {
	b := []byte(s)
	for i, c := range b {
		if c >= 'A' && c <= 'Z' {
			b[i] = c + ('a' - 'A')
		}
	}
	return string(b)
}

func textConditions(query string, qp *filters.Params) []string {
	var conds []string
	var tokens []string
	seen := map[string]bool{}
	for _, word := range strings.Fields(query) {
		wordTokens := tokenize(word)
		for _, t := range wordTokens {
			if !seen[t] {
				seen[t] = true
				tokens = append(tokens, t)
			}
		}
		if len(wordTokens) != 1 || wordTokens[0] != asciiLower(word) {
			conds = append(conds, "lower(Body) LIKE "+qp.Add("%"+escapeLike(asciiLower(word))+"%"))
		}
	}
	for i := 0; i < len(tokens); i += maxTokensPerCheck {
		end := min(i+maxTokensPerCheck, len(tokens))
		conds = append(conds, "hasAllTokens(lower(Body), "+qp.Add(tokens[i:end])+")")
	}
	return conds
}

func escapeLike(s string) string {
	return strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(s)
}

// window returns the idx-th search window, walking back from endMs.
func window(startMs, endMs int64, idx int) (int64, int64, bool) {
	hi := endMs
	for i := 0; ; i++ {
		if hi <= startMs {
			return 0, 0, false
		}
		size := windowSizes[min(i, len(windowSizes)-1)].Milliseconds()
		lo := max(hi-size, startMs)
		if i == idx {
			return lo, hi, true
		}
		hi = lo
	}
}

type cursor struct {
	Window int `json:"w"`
	Offset int `json:"o"`
}

func encodeCursor(c cursor) string {
	b, _ := json.Marshal(c)
	return base64.RawURLEncoding.EncodeToString(b)
}

func decodeCursor(s string) (cursor, error) {
	var c cursor
	if s == "" {
		return c, nil
	}
	b, err := base64.RawURLEncoding.DecodeString(s)
	if err != nil || json.Unmarshal(b, &c) != nil || c.Window < 0 || c.Offset < 0 {
		return c, invalid("invalid cursor")
	}
	return c, nil
}

func histogramStep(startMs, endMs int64) int64 {
	rangeSec := (endMs - startMs + 999) / 1000
	target := (rangeSec + histogramBuckets - 1) / histogramBuckets
	for _, s := range histogramSteps {
		if s >= target {
			return s
		}
	}
	return histogramSteps[len(histogramSteps)-1]
}

func fillBuckets(startMs, endMs, step int64, counts map[int64]map[string]uint64) []Bucket {
	stepMs := step * 1000
	first := startMs / stepMs * stepMs
	buckets := make([]Bucket, 0, (endMs-first)/stepMs+1)
	for t := first; t < endMs; t += stepMs {
		b := Bucket{Time: t, BySeverity: map[string]uint64{}}
		for sev, c := range counts[t/1000] {
			b.BySeverity[sev] = c
			b.Total += c
		}
		buckets = append(buckets, b)
	}
	return buckets
}

func stripInternal(attrs map[string]string) map[string]string {
	for k := range attrs {
		if strings.HasPrefix(k, internalKeyPrefix) {
			delete(attrs, k)
		}
	}
	return attrs
}

func usesOnlyTime(f *Filter, ex exclusion) bool {
	return f.Query == "" && len(f.Attributes) == 0 &&
		(len(f.Services) == 0 || ex.services) &&
		(len(f.Severities) == 0 || ex.severities)
}
