package charts

import (
	"fmt"
	"strings"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"

	"openreplay/backend/pkg/analytics/model"
)

type BreakdownDimension struct {
	SessionColumn   string
	EventColumn     string
	EventOnly       bool
	CastToString    bool
	SessionJoin     bool
	PositionalAlias bool
}

var breakdownDimensions = map[string]BreakdownDimension{
	"userCountry":        {SessionColumn: "user_country", EventColumn: `e."$country"`},
	"userCity":           {SessionColumn: "user_city", EventColumn: `e."$city"`},
	"userState":          {SessionColumn: "user_state", EventColumn: `e."$state"`},
	"userBrowser":        {SessionColumn: "user_browser", EventColumn: `e."$browser"`},
	"userBrowserVersion": {SessionColumn: "ifNull(user_browser_version, '')", EventColumn: `e."$browser_version"`, PositionalAlias: true},
	"userDevice":         {SessionColumn: "user_device", EventColumn: "s.user_device", SessionJoin: true},
	"userOs":             {SessionColumn: "user_os", EventColumn: `e."$os"`},
	"referrer":           {SessionColumn: "referrer", EventColumn: `e."$referrer"`},
	"userId":             {SessionColumn: "user_id", EventColumn: "s.user_id", SessionJoin: true},
	"platform":           {SessionColumn: "platform", EventColumn: "s.platform", SessionJoin: true},
	"utmSource":          {SessionColumn: "utm_source", EventColumn: `e.utm_source`},
	"utmMedium":          {SessionColumn: "utm_medium", EventColumn: `e.utm_medium`},
	"utmCampaign":        {SessionColumn: "utm_campaign", EventColumn: `e.utm_campaign`},
	"userDeviceType":     {SessionColumn: "user_device_type", EventColumn: `e."$device"`},
	"revId":              {SessionColumn: "rev_id", EventColumn: "s.rev_id", SessionJoin: true},
	"issueType":          {SessionColumn: "arrayJoin(issue_types)", EventColumn: "e.issue_type"},
	"duration":           {SessionColumn: "toString(duration)", EventColumn: "toString(s.duration)", SessionJoin: true, PositionalAlias: true},
	"screenHeight":       {SessionColumn: "ifNull(toString(screen_height), '')", EventColumn: "ifNull(toString(s.screen_height), '')", SessionJoin: true, PositionalAlias: true},
	"screenWidth":        {SessionColumn: "ifNull(toString(screen_width), '')", EventColumn: "ifNull(toString(s.screen_width), '')", SessionJoin: true, PositionalAlias: true},
	"currentPath":        {EventColumn: `"$current_path"`, EventOnly: true},
	"referringDomain":    {EventColumn: `"$referring_domain"`, EventOnly: true},
	"searchEngine":       {EventColumn: `"$search_engine"`, EventOnly: true},
	"httpMethod":         {EventColumn: `"$properties"."method"`, EventOnly: true, CastToString: true},
	"statusCode":         {EventColumn: `"$properties"."status"`, EventOnly: true, CastToString: true},
	"urlHost":            {EventColumn: `"$properties"."url_host"`, EventOnly: true, CastToString: true},
}

var breakdownAliases = map[string]string{
	"issue": "issueType",
}

type resolvedBreakdown struct {
	Name            string
	SessionColumn   string
	EventColumn     string
	EventOnly       bool
	CastToString    bool
	SessionJoin     bool
	PositionalAlias bool
	ok              bool
	dynamic         bool
	dynamicKey      string
	dynamicAuto     bool
}

func canonicalBreakdownName(name string) string {
	if canonical, ok := breakdownAliases[name]; ok {
		return canonical
	}
	return name
}

var nonProjectableSessionColumns = map[string]bool{
	"metadata": true,
}

var backtickIdentifierReplacer = strings.NewReplacer("\\", "\\\\", "`", "\\`")

func sessionFallbackBreakdown(name, column string, isArray bool) resolvedBreakdown {
	sessionExpr := column
	eventExpr := "s." + column
	if isArray {
		sessionExpr = fmt.Sprintf("arrayJoin(%s)", sessionExpr)
		eventExpr = fmt.Sprintf("arrayJoin(%s)", eventExpr)
	}
	return resolvedBreakdown{
		Name:            name,
		SessionColumn:   fmt.Sprintf("ifNull(toString(%s), '')", sessionExpr),
		EventColumn:     fmt.Sprintf("ifNull(toString(%s), '')", eventExpr),
		SessionJoin:     true,
		PositionalAlias: true,
		ok:              true,
	}
}

func resolveBreakdown(b model.Breakdown) (resolvedBreakdown, error) {
	name := strings.TrimSpace(b.Name)
	if name == "" {
		return resolvedBreakdown{}, fmt.Errorf("breakdown name is required")
	}
	canonical := canonicalBreakdownName(name)
	if dim, ok := breakdownDimensions[canonical]; ok && (!b.IsEvent || dim.EventOnly) {
		return resolvedBreakdown{
			Name:            canonical,
			SessionColumn:   dim.SessionColumn,
			EventColumn:     dim.EventColumn,
			EventOnly:       dim.EventOnly,
			CastToString:    dim.CastToString,
			SessionJoin:     dim.SessionJoin,
			PositionalAlias: dim.PositionalAlias,
			ok:              true,
		}, nil
	}
	if b.IsEvent {
		if col, ok := eventPropertyColumns[name]; ok {
			return resolvedBreakdown{
				Name:            name,
				EventColumn:     col,
				EventOnly:       true,
				PositionalAlias: true,
				ok:              true,
			}, nil
		}
		if IsMetadataColumn(name) {
			return sessionFallbackBreakdown(name, name, false), nil
		}
		key := name
		if b.AutoCaptured {
			key = CamelToSnake(key)
		}
		if strings.ContainsRune(key, '@') {
			return resolvedBreakdown{}, fmt.Errorf("unsupported breakdown %q", b.Name)
		}
		return resolvedBreakdown{
			Name:            name,
			EventOnly:       true,
			PositionalAlias: true,
			ok:              true,
			dynamic:         true,
			dynamicKey:      key,
			dynamicAuto:     b.AutoCaptured,
		}, nil
	}
	for _, candidate := range []string{name, CamelToSnake(name)} {
		if cols, ok := SessionColumns[candidate]; ok && !nonProjectableSessionColumns[cols[0]] {
			return sessionFallbackBreakdown(name, cols[0], cols[1] == "arrayColumn"), nil
		}
		if IsMetadataColumn(candidate) {
			return sessionFallbackBreakdown(name, candidate, false), nil
		}
	}
	return resolvedBreakdown{}, fmt.Errorf("unsupported breakdown %q", b.Name)
}

func resolveBreakdowns(breakdowns []model.Breakdown) []resolvedBreakdown {
	out := make([]resolvedBreakdown, len(breakdowns))
	for i, b := range breakdowns {
		if r, err := resolveBreakdown(b); err == nil {
			out[i] = r
		}
	}
	return out
}

func (r resolvedBreakdown) alias(index int) string {
	if r.PositionalAlias {
		return fmt.Sprintf("break%d", index+1)
	}
	return r.Name
}

func (r resolvedBreakdown) eventExpr(tableAlias string) string {
	if r.dynamic {
		propertiesColumn := "properties"
		if r.dynamicAuto {
			propertiesColumn = `"$properties"`
		}
		if tableAlias != "" {
			propertiesColumn = tableAlias + "." + propertiesColumn
		}
		return fmt.Sprintf("toString(%s.`%s`)", propertiesColumn, backtickIdentifierReplacer.Replace(r.dynamicKey))
	}
	col := fmt.Sprintf("%s.%s", tableAlias, r.EventColumn)
	if r.CastToString {
		return fmt.Sprintf("toString(%s)", col)
	}
	return col
}

func NormalizeBreakdownValue(s string) string {
	if s == "" {
		return "(empty)"
	}
	return s
}

func HasEventOnlyBreakdowns(breakdowns []model.Breakdown) bool {
	for _, r := range resolveBreakdowns(breakdowns) {
		if r.ok && r.EventOnly {
			return true
		}
	}
	return false
}

func SplitBreakdowns(breakdowns []model.Breakdown) (session []model.Breakdown, eventOnly []model.Breakdown) {
	resolved := resolveBreakdowns(breakdowns)
	for i, b := range breakdowns {
		if !resolved[i].ok {
			continue
		}
		if resolved[i].EventOnly {
			eventOnly = append(eventOnly, b)
		} else {
			session = append(session, b)
		}
	}
	return
}

func GetEventOnlyBreakdownProjection(breakdowns []model.Breakdown, tableAlias string) []string {
	parts := make([]string, 0)
	for i, r := range resolveBreakdowns(breakdowns) {
		if !r.ok || !r.EventOnly {
			continue
		}
		parts = append(parts, fmt.Sprintf(`%s AS break%d`, r.eventExpr(tableAlias), i+1))
	}
	return parts
}

func GetEventOnlyBreakdownNamedProjection(breakdowns []model.Breakdown, tableAlias string) []string {
	parts := make([]string, 0)
	for i, r := range resolveBreakdowns(breakdowns) {
		if !r.ok || !r.EventOnly {
			continue
		}
		parts = append(parts, fmt.Sprintf(`%s AS %s`, r.eventExpr(tableAlias), r.alias(i)))
	}
	return parts
}

func ValidateBreakdowns(breakdowns []model.Breakdown) error {
	if len(breakdowns) > MaxBreakdowns {
		return fmt.Errorf("too many breakdowns: got %d, max %d", len(breakdowns), MaxBreakdowns)
	}
	seen := make(map[string]bool, len(breakdowns))
	for _, b := range breakdowns {
		r, err := resolveBreakdown(b)
		if err != nil {
			return err
		}
		if seen[r.Name] {
			return fmt.Errorf("duplicate breakdown %q", r.Name)
		}
		seen[r.Name] = true
	}
	return nil
}

func SeriesKey(name, fallback string) string {
	if name != "" {
		return name
	}
	return fallback
}

func WrapInSeries(key string, value interface{}) map[string]interface{} {
	return map[string]interface{}{
		"series": map[string]interface{}{key: value},
	}
}

func BuildScanArgs(before []interface{}, bdVals []string, after []interface{}) []interface{} {
	args := make([]interface{}, 0, len(before)+len(bdVals)+len(after))
	args = append(args, before...)
	for i := range bdVals {
		args = append(args, &bdVals[i])
	}
	args = append(args, after...)
	return args
}

type BreakdownTree[T any] struct {
	Value    T
	Children map[string]*BreakdownTree[T]
	IsLeaf   bool
}

func NewBreakdownTree[T any](zero T) *BreakdownTree[T] {
	return &BreakdownTree[T]{
		Value:    zero,
		Children: make(map[string]*BreakdownTree[T]),
	}
}

func (t *BreakdownTree[T]) Insert(bdVals []string, numBreakdowns int, newZero func() T, accumulate func(*T)) bool {
	accumulate(&t.Value)
	current := t
	for depth := 0; depth < numBreakdowns; depth++ {
		bdVal := NormalizeBreakdownValue(bdVals[depth])
		child, exists := current.Children[bdVal]
		if !exists {
			if len(current.Children) >= MaxBreakdownCardinality {
				return false
			}
			child = &BreakdownTree[T]{
				Value:    newZero(),
				Children: make(map[string]*BreakdownTree[T]),
				IsLeaf:   depth == numBreakdowns-1,
			}
			current.Children[bdVal] = child
		}
		accumulate(&child.Value)
		current = child
	}
	return true
}

func (t *BreakdownTree[T]) ToMap(render func(T) interface{}) map[string]interface{} {
	result := map[string]interface{}{
		"$overall": render(t.Value),
	}
	for key, child := range t.Children {
		if child.IsLeaf {
			result[key] = render(child.Value)
		} else {
			result[key] = child.ToMap(render)
		}
	}
	return result
}

func WalkTree[T any](node *BreakdownTree[T], fn func(*T)) {
	fn(&node.Value)
	for _, child := range node.Children {
		WalkTree(child, fn)
	}
}

func GetBreakdownProjection(breakdowns []model.Breakdown, tableAlias string) string {
	if len(breakdowns) == 0 {
		return ""
	}
	parts := make([]string, 0, len(breakdowns))
	for i, r := range resolveBreakdowns(breakdowns) {
		if !r.ok || r.EventOnly {
			continue
		}
		col := r.SessionColumn
		if strings.Contains(col, "(") || strings.Contains(col, ".") {
			parts = append(parts, fmt.Sprintf("%s AS %s", col, r.alias(i)))
		} else {
			parts = append(parts, fmt.Sprintf("%s.%s AS %s", tableAlias, col, r.alias(i)))
		}
	}
	if len(parts) == 0 {
		return ""
	}
	return strings.Join(parts, ", ")
}

func GetBreakdownSelectColumns(breakdowns []model.Breakdown, tableAlias ...string) []string {
	prefix := ""
	if len(tableAlias) > 0 && tableAlias[0] != "" {
		prefix = tableAlias[0] + "."
	}
	cols := make([]string, 0, len(breakdowns))
	for i, r := range resolveBreakdowns(breakdowns) {
		if !r.ok {
			continue
		}
		cols = append(cols, prefix+r.alias(i))
	}
	return cols
}

func GetBreakdownJoinRefs(breakdowns []model.Breakdown, eventAlias, sessionAlias string) []string {
	refs := make([]string, 0, len(breakdowns))
	for i, r := range resolveBreakdowns(breakdowns) {
		if !r.ok {
			continue
		}
		if r.EventOnly {
			refs = append(refs, eventAlias+"."+r.alias(i))
		} else {
			refs = append(refs, sessionAlias+"."+r.alias(i))
		}
	}
	return refs
}

func BuildBreakdownGroupBy(baseColumns []string, breakdowns []model.Breakdown) string {
	if len(breakdowns) > 0 {
		return "GROUP BY ALL"
	}
	if len(baseColumns) == 0 {
		return ""
	}
	return "GROUP BY " + strings.Join(baseColumns, ", ")
}

func AppendBreakdownProjection(projection string, breakdowns []model.Breakdown, tableAlias string) string {
	if bdProj := GetBreakdownProjection(breakdowns, tableAlias); bdProj != "" {
		return projection + ", " + bdProj
	}
	return projection
}

func BuildSessionsFilterConditions(sessionFilters []model.Filter) []string {
	_, _, sessionConditions := BuildEventConditions(sessionFilters, BuildConditionsOptions{
		DefinedColumns: SessionColumns,
		MainTableAlias: "s",
	})

	durConds, _ := BuildDurationWhere(sessionFilters, "s")

	whereParts := []string{
		"s.project_id = @projectId",
		"s.datetime >= toDateTime(@startTimestamp/1000)",
		"s.datetime <= toDateTime(@endTimestamp/1000)",
	}

	if len(sessionConditions) > 0 {
		whereParts = append(whereParts, strings.Join(sessionConditions, " AND "))
	}
	if durConds != nil {
		whereParts = append(whereParts, durConds...)
	}

	return whereParts
}

func GetTableBreakdownProjection(breakdowns []model.Breakdown) []string {
	parts := make([]string, 0, len(breakdowns))
	for i, r := range resolveBreakdowns(breakdowns) {
		if !r.ok || r.EventOnly {
			continue
		}
		parts = append(parts, fmt.Sprintf(`%s AS break%d`, r.SessionColumn, i+1))
	}
	return parts
}

func GetFunnelBreakdownProjection(breakdowns []model.Breakdown) []string {
	parts := make([]string, 0, len(breakdowns))
	for i, r := range resolveBreakdowns(breakdowns) {
		if !r.ok {
			continue
		}
		col := r.EventColumn
		if r.EventOnly {
			col = r.eventExpr("e")
		}
		parts = append(parts, fmt.Sprintf(`%s AS break%d`, col, i+1))
	}
	return parts
}

func GetFunnelBreakdownOuterColumns(n int) []string {
	cols := make([]string, n)
	for i := 0; i < n; i++ {
		cols[i] = fmt.Sprintf("break%d", i+1)
	}
	return cols
}

func FunnelBreakdownNeedsSessions(breakdowns []model.Breakdown) bool {
	for _, r := range resolveBreakdowns(breakdowns) {
		if r.ok && r.SessionJoin {
			return true
		}
	}
	return false
}

func BuildSessionsSubQuery(sessionFilters []model.Filter, startTimestamp uint64, breakdowns []model.Breakdown) string {
	whereParts := BuildSessionsFilterConditions(sessionFilters)
	sessionsTable := getMainSessionsTable(startTimestamp)

	selectCols := "session_id, datetime, user_id, user_uuid, user_anonymous_id"
	if bdProj := GetBreakdownProjection(breakdowns, "s"); bdProj != "" {
		selectCols += ", " + bdProj
	}

	return fmt.Sprintf(
		"SELECT %s\nFROM %s AS s\nWHERE %s",
		selectCols, sessionsTable, strings.Join(whereParts, " AND "),
	)
}

func newBreakdownKey(timestamp uint64, bdVals []string) breakdownKey {
	if len(bdVals) > MaxBreakdowns {
		bdVals = bdVals[:MaxBreakdowns]
	}
	var key breakdownKey
	key.Timestamp = timestamp
	copy(key.Values[:], bdVals)
	return key
}

func ScanBreakdownRows(rows driver.Rows, numBreakdowns int, seriesName string, data map[breakdownKey]map[string]uint64) error {
	var timestamp uint64
	var count uint64
	bdVals := make([]string, numBreakdowns)

	scanArgs := BuildScanArgs(
		[]interface{}{&timestamp},
		bdVals,
		[]interface{}{&count},
	)

	for rows.Next() {
		if err := rows.Scan(scanArgs...); err != nil {
			return fmt.Errorf("scan: %w", err)
		}

		key := newBreakdownKey(timestamp, bdVals)
		if data[key] == nil {
			data[key] = map[string]uint64{}
		}
		data[key][seriesName] = count
	}
	return rows.Err()
}

func BuildTimeseriesSeriesMap(data map[breakdownKey]map[string]uint64, breakdowns []model.Breakdown, seriesNames []string) map[string]interface{} {
	numBreakdowns := len(breakdowns)
	type tsCountMap = map[uint64]uint64

	seriesMap := make(map[string]interface{}, len(seriesNames))

	for _, seriesName := range seriesNames {
		if numBreakdowns == 0 {
			flat := make(tsCountMap)
			for key, counts := range data {
				flat[key.Timestamp] += counts[seriesName]
			}
			seriesMap[seriesName] = flat
			continue
		}

		tree := NewBreakdownTree(make(tsCountMap))
		newZero := func() tsCountMap { return make(tsCountMap) }
		var ts uint64
		var count uint64
		accumulate := func(v *tsCountMap) { (*v)[ts] += count }

		for key, counts := range data {
			count = counts[seriesName]
			ts = key.Timestamp
			tree.Insert(key.Values[:numBreakdowns], numBreakdowns, newZero, accumulate)
		}

		WalkTree(tree, func(v *tsCountMap) {
			for ts := range tree.Value {
				if _, exists := (*v)[ts]; !exists {
					(*v)[ts] = 0
				}
			}
		})

		seriesMap[seriesName] = tree.ToMap(func(v tsCountMap) interface{} { return v })
	}

	return map[string]interface{}{
		"series": seriesMap,
	}
}
