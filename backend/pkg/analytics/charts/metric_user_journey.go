package charts

import (
	"fmt"
	"math"
	"openreplay/backend/pkg/analytics/db"
	"openreplay/backend/pkg/analytics/model"
	"sort"
	"strconv"
	"strings"
	"time"
)

// Node represents a point in the journey diagram.
type Node struct {
	Depth        int    `json:"depth"`
	Name         string `json:"name"`
	EventType    string `json:"eventType"`
	ID           int    `json:"id"`
	StartingNode bool   `json:"startingNode"`
}

// Link represents a transition between nodes.
type Link struct {
	EventType     string  `json:"eventType"`
	SessionsCount int     `json:"sessionsCount"`
	Value         float64 `json:"value"`
	Source        int     `json:"source"`
	Target        int     `json:"target"`
}

// JourneyData holds all nodes and links for the response.
type JourneyData struct {
	Nodes []Node `json:"nodes"`
	Links []Link `json:"links"`
}

// JourneyResponse is the API response structure.
type JourneyResponse struct {
	Data JourneyData `json:"data"`
}

// UserJourneyQueryBuilder builds and executes the journey query.
type UserJourneyQueryBuilder struct{}

func (h UserJourneyQueryBuilder) Execute(p Payload, conn db.Connector) (interface{}, error) {
	q, err := h.buildQuery(p)
	if err != nil {
		return nil, err
	}
	rows, err := conn.Query(q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	type row struct {
		Stage                int64
		CurrentEventName     string
		CurrentEventProperty string
		PrevEventName        string
		PrevEventProperty    string
		SessionsCount        uint64
	}

	// Parse all rows into a slice
	var rawData []row
	for rows.Next() {
		var r row
		if err := rows.Scan(
			&r.Stage,
			&r.CurrentEventName,
			&r.CurrentEventProperty,
			&r.PrevEventName,
			&r.PrevEventProperty,
			&r.SessionsCount,
		); err != nil {
			return nil, err
		}

		if r.SessionsCount == 0 {
			continue
		}

		rawData = append(rawData, r)
	}

	// Group data by stage
	dataByStage := make(map[int64][]row)
	var minStage int64 = 0
	var maxStage int64 = 0

	for _, r := range rawData {
		dataByStage[r.Stage] = append(dataByStage[r.Stage], r)
		if r.Stage > maxStage {
			maxStage = r.Stage
		}
		if r.Stage < minStage {
			minStage = r.Stage
		}
	}

	// Calculate total sessions per stage
	stageTotals := make(map[int64]uint64)
	for stage, stageRows := range dataByStage {
		for _, r := range stageRows {
			stageTotals[stage] += r.SessionsCount
		}
	}

	// Determine base count for percentage calculations
	// We'll use the starting point (usually stage 1) as our base
	var baseSessionsCount uint64
	if count, exists := stageTotals[1]; exists {
		baseSessionsCount = count
	} else {
		// If stage 1 doesn't exist, use the first available positive stage
		for stage := int64(0); stage <= maxStage; stage++ {
			if count, exists := stageTotals[stage]; exists {
				baseSessionsCount = count
				break
			}
		}
	}

	if baseSessionsCount == 0 {
		baseSessionsCount = 1 // Prevent division by zero
	}

	// Number of top nodes to display per stage
	topLimit := int(p.Rows)
	if topLimit <= 0 {
		topLimit = 5 // Default if not specified
	}

	// Step 1: Determine the top paths at each stage based on destination
	type pathKey struct {
		eventName string
		eventProp string
	}

	// Map to store top paths for each stage
	topPathsByStage := make(map[int64]map[pathKey]bool)
	pathCountsByStage := make(map[int64]map[pathKey]uint64)

	for stage := minStage; stage <= maxStage; stage++ {
		// Skip if this stage has no data
		if _, exists := dataByStage[stage]; !exists {
			continue
		}

		// Sort rows within each stage by session count (descending)
		sort.Slice(dataByStage[stage], func(i, j int) bool {
			return dataByStage[stage][i].SessionsCount > dataByStage[stage][j].SessionsCount
		})

		// Initialize maps for this stage
		topPathsByStage[stage] = make(map[pathKey]bool)
		pathCountsByStage[stage] = make(map[pathKey]uint64)

		// First, aggregate by path to get total sessions per path
		for _, r := range dataByStage[stage] {
			key := pathKey{eventName: r.CurrentEventName, eventProp: r.CurrentEventProperty}
			pathCountsByStage[stage][key] += r.SessionsCount
		}

		// Then sort paths by session count
		type pathCount struct {
			path  pathKey
			count uint64
		}

		var paths []pathCount
		for path, count := range pathCountsByStage[stage] {
			paths = append(paths, pathCount{path: path, count: count})
		}

		// Sort descending by count
		sort.Slice(paths, func(i, j int) bool {
			return paths[i].count > paths[j].count
		})

		// Mark top paths - take exactly topLimit or all if fewer available
		for i, pc := range paths {
			if i < topLimit {
				topPathsByStage[stage][pc.path] = true
			}
		}
	}

	// Step 2: Create a normalized sequential depth mapping
	// First, gather all stages that have data
	var stagesWithData []int64
	for stage := range dataByStage {
		stagesWithData = append(stagesWithData, stage)
	}

	// Sort stages
	sort.Slice(stagesWithData, func(i, j int) bool {
		return stagesWithData[i] < stagesWithData[j]
	})

	var startingStage int64
	for _, s := range stagesWithData {
		if s > 0 {
			startingStage = s
			break
		}
	}

	// Create a mapping from logical stage to display depth (ensuring no gaps)
	stageToDepth := make(map[int64]int)
	for i, stage := range stagesWithData {
		stageToDepth[stage] = i
	}

	// Determine depth of central node (stage 1 or equivalent)
	var centralDepth int
	if depth, exists := stageToDepth[1]; exists {
		centralDepth = depth
	} else {
		// If stage 1 doesn't exist, use the first positive stage
		for _, stage := range stagesWithData {
			if stage > 0 {
				centralDepth = stageToDepth[stage]
				break
			}
		}
	}

	// Step 3: Create nodes with normalized depths
	var nodes []Node
	var links []Link
	nodeID := 0

	// Maps to track nodes and sessions
	nodeMap := make(map[string]int)    // Stage|EventName|EventProp → nodeID
	othersNodes := make(map[int64]int) // stage → "Others" nodeID
	dropNodes := make(map[int64]int)   // stage → "Drop" nodeID

	incomingSessions := make(map[int]uint64) // nodeID → incoming sessions
	outgoingSessions := make(map[int]uint64) // nodeID → outgoing sessions

	// Create all nodes using normalized depths
	for _, stage := range stagesWithData {
		displayDepth := stageToDepth[stage]

		// Create regular nodes for top paths
		for path := range topPathsByStage[stage] {
			nodeKey := fmt.Sprintf("%d|%s|%s", stage, path.eventName, path.eventProp)
			nodeMap[nodeKey] = nodeID

			nodes = append(nodes, Node{
				ID:           nodeID,
				Depth:        displayDepth,
				Name:         path.eventProp,
				EventType:    path.eventName,
				StartingNode: stage == startingStage,
			})

			// For the central stage (usually stage 1) or first stage, set incoming sessions
			if (stage == 1) || (stage == minStage && minStage != 1) {
				incomingSessions[nodeID] = pathCountsByStage[stage][path]
			}

			nodeID++
		}

		// Calculate if we need an "Others" node (when total paths > topLimit)
		totalPaths := len(pathCountsByStage[stage])
		if totalPaths > topLimit {
			// Calculate sessions that will go to Others
			othersCount := uint64(0)
			for path, count := range pathCountsByStage[stage] {
				if !topPathsByStage[stage][path] {
					othersCount += count
				}
			}

			// Only create Others if it has sessions
			if othersCount > 0 {
				othersNodes[stage] = nodeID

				nodes = append(nodes, Node{
					ID:           nodeID,
					Depth:        displayDepth,
					Name:         "Other",
					EventType:    "OTHER",
					StartingNode: stage == startingStage,
				})

				// For the central stage or first stage, set incoming sessions for Others
				if (stage == 1) || (stage == minStage && minStage != 1) {
					incomingSessions[nodeID] = othersCount
				}

				nodeID++
			}
		}
	}

	// Step 4: Create links between adjacent nodes only
	// Use a map to deduplicate links
	type linkKey struct {
		src int
		tgt int
	}
	linkSessions := make(map[linkKey]uint64)
	linkTypes := make(map[linkKey]string)

	// For each stage (except the first), create links from the previous stage
	for i := 1; i < len(stagesWithData); i++ {
		currentStage := stagesWithData[i]
		prevStage := stagesWithData[i-1]

		for _, r := range dataByStage[currentStage] {
			// Skip if previous stage doesn't match expected
			if r.Stage != currentStage {
				continue
			}

			// Determine source node
			prevPathKey := fmt.Sprintf("%d|%s|%s", prevStage, r.PrevEventName, r.PrevEventProperty)
			srcID, hasSrc := nodeMap[prevPathKey]

			if !hasSrc {
				// If source isn't a top node, use Others from previous stage
				if othersID, hasOthers := othersNodes[prevStage]; hasOthers {
					srcID = othersID
					hasSrc = true
				} else {
					// Skip if we can't find a source
					continue
				}
			}

			// Determine target node
			curPath := pathKey{eventName: r.CurrentEventName, eventProp: r.CurrentEventProperty}
			var tgtID int
			var hasTgt bool

			// Check if this path is in the top paths for this stage
			if topPathsByStage[currentStage][curPath] {
				// It's a top node
				curPathKey := fmt.Sprintf("%d|%s|%s", currentStage, r.CurrentEventName, r.CurrentEventProperty)
				tgtID = nodeMap[curPathKey]
				hasTgt = true
			} else {
				// It's part of Others
				if othersID, hasOthers := othersNodes[currentStage]; hasOthers {
					tgtID = othersID
					hasTgt = true
				}
			}

			if !hasSrc || !hasTgt {
				continue
			}

			// Update session tracking
			incomingSessions[tgtID] += r.SessionsCount
			outgoingSessions[srcID] += r.SessionsCount

			// Record link (deduplicating)
			lk := linkKey{src: srcID, tgt: tgtID}
			linkSessions[lk] += r.SessionsCount

			// Prefer non-OTHER event type
			if linkTypes[lk] == "" || linkTypes[lk] == "OTHER" {
				linkTypes[lk] = r.CurrentEventName
			}
		}
	}

	// Create deduplicated links with proper percentages
	for lk, count := range linkSessions {
		// Calculate percentage based on baseSessionsCount
		percent := math.Round(float64(count)*10000/float64(baseSessionsCount)) / 100

		links = append(links, Link{
			Source:        lk.src,
			Target:        lk.tgt,
			SessionsCount: int(count),
			Value:         percent,
			EventType:     linkTypes[lk],
		})
	}

	// Step 5: Calculate drops and create drop nodes (only for stages ≥ 0)
	// Process forward drops (positive stages only)
	for i := 0; i < len(stagesWithData)-1; i++ {
		stage := stagesWithData[i]

		// Skip negative stages for drops
		if stage < 0 {
			continue
		}

		// Calculate new drops at this stage
		stageDrops := uint64(0)
		dropsFromNode := make(map[int]uint64) // nodeID -> drop count

		for _, node := range nodes {
			nodeDepth := node.Depth

			// Skip if this node isn't in the current stage
			if nodeDepth != stageToDepth[stage] {
				continue
			}

			incoming := incomingSessions[node.ID]
			outgoing := outgoingSessions[node.ID]

			if incoming > outgoing {
				dropCount := incoming - outgoing
				dropsFromNode[node.ID] = dropCount
				stageDrops += dropCount
			}
		}

		// Skip if no drops
		if stageDrops == 0 {
			continue
		}

		// Determine next stage depth for drop node positioning
		var dropDepth int
		if i+1 < len(stagesWithData) {
			dropDepth = stageToDepth[stagesWithData[i+1]]
		} else {
			dropDepth = stageToDepth[stage] + 1
		}

		// Create drop node
		dropNodes[stage] = nodeID

		nodes = append(nodes, Node{
			ID:        nodeID,
			Depth:     dropDepth,
			Name:      "Drop",
			EventType: "DROP",
		})

		// Create links from nodes with drops to the drop node
		for nid, dropCount := range dropsFromNode {
			if dropCount == 0 {
				continue
			}

			// Calculate percentage based on baseSessionsCount
			percent := math.Round(float64(dropCount)*10000/float64(baseSessionsCount)) / 100

			links = append(links, Link{
				Source:        nid,
				Target:        nodeID,
				SessionsCount: int(dropCount),
				Value:         percent,
				EventType:     "DROP",
			})
		}

		// Link previous drop node to current drop node to show accumulation
		if i > 0 {
			for j := i - 1; j >= 0; j-- {
				prevStage := stagesWithData[j]
				if prevDropID, hasPrevDrop := dropNodes[prevStage]; hasPrevDrop {
					// Link previous drop to current drop to show accumulation
					prevDropCount := uint64(0)
					for _, link := range links {
						if link.Target == prevDropID && link.EventType == "DROP" {
							prevDropCount += uint64(link.SessionsCount)
						}
					}

					percent := math.Round(float64(prevDropCount)*10000/float64(baseSessionsCount)) / 100

					links = append(links, Link{
						Source:        prevDropID,
						Target:        nodeID,
						SessionsCount: int(prevDropCount),
						Value:         percent,
						EventType:     "DROP",
					})
					break
				}
			}
		}

		nodeID++
	}

	// Filter out nodes with no connections
	nodeHasConnection := make(map[int]bool)
	for _, link := range links {
		nodeHasConnection[link.Source] = true
		nodeHasConnection[link.Target] = true
	}

	// Make sure central nodes are included even if they don't have links
	for _, node := range nodes {
		if node.Depth == centralDepth {
			nodeHasConnection[node.ID] = true
		}
	}

	var filteredNodes []Node
	for _, node := range nodes {
		if nodeHasConnection[node.ID] {
			filteredNodes = append(filteredNodes, node)
		}
	}

	// Reassign IDs to be sequential
	nodeIDMap := make(map[int]int)
	var finalNodes []Node = make([]Node, 0, len(filteredNodes))

	for newID, node := range filteredNodes {
		nodeIDMap[node.ID] = newID
		node.ID = newID
		finalNodes = append(finalNodes, node)
	}

	// Update link references
	var finalLinks []Link = make([]Link, 0, len(links))
	for _, link := range links {
		srcID, srcExists := nodeIDMap[link.Source]
		tgtID, tgtExists := nodeIDMap[link.Target]

		if srcExists && tgtExists {
			link.Source = srcID
			link.Target = tgtID
			finalLinks = append(finalLinks, link)
		}
	}

	return JourneyData{
		Nodes: finalNodes,
		Links: finalLinks,
	}, nil
}

func (h UserJourneyQueryBuilder) buildQuery(p Payload) (string, error) {
	// prepare event list filter
	events := p.MetricValue
	if len(events) == 0 {
		events = []string{"LOCATION"}
	}
	vals := make([]string, len(events))
	for i, v := range events {
		vals[i] = fmt.Sprintf("'%s'", v)
	}
	laterCond := fmt.Sprintf("e.\"$event_name\" IN (%s)", strings.Join(vals, ","))

	// build start and exclude conditions
	startConds, _ := buildEventConditions(p.StartPoint, BuildConditionsOptions{DefinedColumns: mainColumns, MainTableAlias: "e"})
	excludeConds, _ := buildEventConditions(p.Exclude, BuildConditionsOptions{DefinedColumns: mainColumns, MainTableAlias: "e"})

	// quote properties column correctly
	fixProps := func(conds []string) []string {
		for i, c := range conds {
			conds[i] = strings.ReplaceAll(c, "e.$properties", "e.\"$properties\"")
		}
		return conds
	}
	startConds = fixProps(startConds)
	excludeConds = fixProps(excludeConds)

	// extract global filters and duration from first series
	s := p.MetricPayload.Series[0]
	var durationMin, durationMax int64
	var okMin, okMax bool
	var err error
	var globalFilters []model.Filter
	for _, flt := range s.Filter.Filters {
		if flt.Type == "duration" {
			if len(flt.Value) > 0 && flt.Value[0] != "" {
				durationMin, err = strconv.ParseInt(flt.Value[0], 10, 64)
				if err != nil {
					return "", err
				}
				okMin = true
			}
			if len(flt.Value) > 1 && flt.Value[1] != "" {
				durationMax, err = strconv.ParseInt(flt.Value[1], 10, 64)
				if err != nil {
					return "", err
				}
				okMax = true
			}
			continue
		}
		if flt.IsEvent {
			continue
		}
		globalFilters = append(globalFilters, flt)
	}
	globalConds, _ := buildEventConditions(globalFilters, BuildConditionsOptions{DefinedColumns: mainColumns, MainTableAlias: "e"})
	globalConds = fixProps(globalConds)

	// assemble duration condition
	var durCond string
	if okMin && okMax {
		durCond = fmt.Sprintf("ss.duration BETWEEN %d AND %d", durationMin, durationMax)
	} else if okMin {
		durCond = fmt.Sprintf("ss.duration >= %d", durationMin)
	} else if okMax {
		durCond = fmt.Sprintf("ss.duration <= %d", durationMax)
	}

	// determine starting event
	var startEvent string
	if len(p.StartPoint) > 0 {
		startEvent = string(p.StartPoint[0].Type)
	} else {
		startEvent = events[0]
	}

	// assemble first_hits WHERE clause with optional duration
	firstBase := []string{fmt.Sprintf("e.\"$event_name\" = '%s'", startEvent)}
	if len(startConds) > 0 {
		firstBase = append(firstBase, startConds...)
	}
	if len(globalConds) > 0 {
		firstBase = append(firstBase, globalConds...)
	}
	firstBase = append(firstBase,
		fmt.Sprintf("e.project_id = %d", p.ProjectId),
		"e.session_id IS NOT NULL",
		fmt.Sprintf("e.created_at BETWEEN toDateTime('%s') AND toDateTime('%s')",
			time.Unix(p.StartTimestamp/1000, 0).UTC().Format("2006-01-02 15:04:05"),
			time.Unix(p.EndTimestamp/1000, 0).UTC().Format("2006-01-02 15:04:05"),
		),
	)
	if durCond != "" {
		firstBase = append(firstBase, durCond)
	}

	// assemble journey WHERE clause
	journeyBase := []string{laterCond}
	if len(excludeConds) > 0 {
		journeyBase = append(journeyBase, "NOT ("+strings.Join(excludeConds, " AND ")+")")
	}
	if len(globalConds) > 0 {
		journeyBase = append(journeyBase, globalConds...)
	}
	journeyBase = append(journeyBase,
		fmt.Sprintf("e.project_id = %d", p.ProjectId),
	)

	// format time bounds
	startTime := time.Unix(p.StartTimestamp/1000, 0).UTC().Format("2006-01-02 15:04:05")
	endTime := time.Unix(p.EndTimestamp/1000, 0).UTC().Format("2006-01-02 15:04:05")

	// set column limits
	previousColumns := p.PreviousColumns
	if previousColumns <= 0 {
		previousColumns = 0
	}
	maxCols := p.Columns
	if maxCols > 0 {
		maxCols++
	}

	// build final query
	q := fmt.Sprintf(`WITH
  first_hits AS (
    SELECT e.session_id, MIN(e.created_at) AS start_time
    FROM product_analytics.events AS e
    JOIN experimental.sessions AS ss USING(session_id)
    WHERE %s
    GROUP BY e.session_id
  ),
  journey_events_after AS (
    SELECT
      e.session_id,
      e.distinct_id,
      e."$event_name" AS event_name,
      e.created_at,
      CASE 
        WHEN e."$event_name" = 'LOCATION' THEN JSONExtractString(toString(e."$properties"), 'url_path')
        WHEN e."$event_name" = 'CLICK' THEN JSONExtractString(toString(e."$properties"), 'label')
        WHEN e."$event_name" = 'INPUT' THEN JSONExtractString(toString(e."$properties"), 'label')
        ELSE NULL
      END AS event_property
    FROM product_analytics.events AS e
    JOIN first_hits AS f USING(session_id)
    WHERE
      e.created_at >= f.start_time
      AND e.created_at <= toDateTime('%s')
      AND %s
  ),
  journey_events_before AS (
    SELECT
      e.session_id,
      e.distinct_id,
      e."$event_name" AS event_name,
      e.created_at,
      CASE 
        WHEN e."$event_name" = 'LOCATION' THEN JSONExtractString(toString(e."$properties"), 'url_path')
        WHEN e."$event_name" = 'CLICK' THEN JSONExtractString(toString(e."$properties"), 'label')
        WHEN e."$event_name" = 'INPUT' THEN JSONExtractString(toString(e."$properties"), 'label')
        ELSE NULL
      END AS event_property
    FROM product_analytics.events AS e
    JOIN first_hits AS f USING(session_id)
    WHERE
      e.created_at < f.start_time
      AND e.created_at >= toDateTime('%s')
      AND %s
      AND %d > 0
  ),
  journey_events_combined AS (
    SELECT *, 1 AS direction FROM journey_events_after
    UNION ALL
    SELECT *, -1 AS direction FROM journey_events_before
  ),
  event_with_prev AS (
    SELECT
      session_id,
      distinct_id,
      event_name,
      event_property,
      created_at,
      direction,
      any(event_name)     OVER (PARTITION BY session_id ORDER BY created_at ROWS BETWEEN 1 PRECEDING AND 1 PRECEDING) AS previous_event_name,
      any(event_property) OVER (PARTITION BY session_id ORDER BY created_at ROWS BETWEEN 1 PRECEDING AND 1 PRECEDING) AS previous_event_property
    FROM journey_events_combined
  ),
  staged AS (
    SELECT
      *,
      CASE
        WHEN direction = 1 THEN toInt64(sumIf(1, true) OVER (PARTITION BY session_id, direction ORDER BY created_at ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW))
        WHEN direction = -1 THEN -1 * toInt64(sumIf(1, true) OVER (PARTITION BY session_id, direction ORDER BY created_at DESC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW))
        ELSE 0
      END AS stage
    FROM event_with_prev
  )
SELECT
  stage AS stage,
  event_name AS current_event_name,
  event_property AS current_event_property,
  COALESCE(previous_event_name, '') AS previous_event_name,
  COALESCE(previous_event_property, '') AS previous_event_property,
  COUNT(DISTINCT session_id) AS sessions_count
FROM staged
WHERE stage <= %d AND stage >= -%d
GROUP BY
  stage,
  event_name,
  event_property,
  previous_event_name,
  previous_event_property
ORDER BY stage, COUNT(DISTINCT session_id) DESC;`,
		strings.Join(firstBase, " AND "),
		endTime,
		strings.Join(journeyBase, " AND "),
		startTime,
		strings.Join(journeyBase, " AND "),
		previousColumns,
		maxCols,
		previousColumns,
	)
	return q, nil
}
