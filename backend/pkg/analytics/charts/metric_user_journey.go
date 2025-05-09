package charts

import (
	"fmt"
	"math"
	"openreplay/backend/pkg/analytics/db"
	"sort"
	"strings"
	"time"
)

// Node represents a point in the journey diagram.
type Node struct {
	Depth     int    `json:"depth"`
	Name      string `json:"name"`
	EventType string `json:"eventType"`
	ID        int    `json:"id"`
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
		Stage                uint64
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

	// Group data by stage and determine max stage
	dataByStage := make(map[uint64][]row)
	var maxStage uint64 = 0
	for _, r := range rawData {
		dataByStage[r.Stage] = append(dataByStage[r.Stage], r)
		if r.Stage > maxStage {
			maxStage = r.Stage
		}
	}

	// Calculate total sessions per stage
	stageTotals := make(map[uint64]uint64)
	for stage, stageRows := range dataByStage {
		for _, r := range stageRows {
			stageTotals[stage] += r.SessionsCount
		}
	}
	initialCount := stageTotals[1]

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
	topPathsByStage := make(map[uint64]map[pathKey]bool)
	pathCountsByStage := make(map[uint64]map[pathKey]uint64)

	for stage := uint64(1); stage <= maxStage; stage++ {
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

		// Mark top paths
		for i, pc := range paths {
			if i < topLimit {
				topPathsByStage[stage][pc.path] = true
			}
		}
	}

	// Step 2: Create nodes and track sessions
	var nodes []Node
	var links []Link
	nodeID := 0

	// Maps to track nodes and sessions
	nodeMap := make(map[string]int)     // Stage|EventName|EventProp → nodeID
	othersNodes := make(map[uint64]int) // stage → "Others" nodeID
	dropNodes := make(map[uint64]int)   // stage → "Drop" nodeID

	incomingSessions := make(map[int]uint64) // nodeID → incoming sessions
	outgoingSessions := make(map[int]uint64) // nodeID → outgoing sessions

	// Create all nodes first
	for stage := uint64(1); stage <= maxStage; stage++ {
		// Create regular nodes for top paths
		for path := range topPathsByStage[stage] {
			nodeKey := fmt.Sprintf("%d|%s|%s", stage, path.eventName, path.eventProp)
			nodeMap[nodeKey] = nodeID

			nodes = append(nodes, Node{
				ID:        nodeID,
				Depth:     int(stage) - 1,
				Name:      path.eventProp,
				EventType: path.eventName,
			})

			// For stage 1, set incoming sessions
			if stage == 1 {
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
					ID:        nodeID,
					Depth:     int(stage) - 1,
					Name:      "other",
					EventType: "OTHER",
				})

				// For stage 1, set incoming sessions for Others
				if stage == 1 {
					incomingSessions[nodeID] = othersCount
				}

				nodeID++
			}
		}
	}

	// Step 3: Create links between nodes
	// Use a map to deduplicate links
	type linkKey struct {
		src int
		tgt int
	}
	linkSessions := make(map[linkKey]uint64)
	linkTypes := make(map[linkKey]string)

	for stage := uint64(2); stage <= maxStage; stage++ {
		for _, r := range dataByStage[stage] {
			// Determine source node
			prevStage := stage - 1
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
			if topPathsByStage[stage][curPath] {
				// It's a top node
				curPathKey := fmt.Sprintf("%d|%s|%s", stage, r.CurrentEventName, r.CurrentEventProperty)
				tgtID = nodeMap[curPathKey]
				hasTgt = true
			} else {
				// It's part of Others
				if othersID, hasOthers := othersNodes[stage]; hasOthers {
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

	// Create deduplicated links
	for lk, count := range linkSessions {
		percent := math.Round(float64(count)*10000/float64(initialCount)) / 100
		links = append(links, Link{
			Source:        lk.src,
			Target:        lk.tgt,
			SessionsCount: int(count),
			Value:         percent,
			EventType:     linkTypes[lk],
		})
	}

	// Step 4: Calculate drops and create drop nodes
	cumulativeDrops := make(map[uint64]uint64)

	for stage := uint64(1); stage < maxStage; stage++ {
		// Calculate new drops at this stage
		stageDrops := uint64(0)
		dropsFromNode := make(map[int]uint64) // nodeID -> drop count

		for _, node := range nodes {
			nodeStage := uint64(node.Depth) + 1
			if nodeStage != stage {
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

		// Calculate cumulative drops
		if stage == 1 {
			cumulativeDrops[stage] = stageDrops
		} else {
			cumulativeDrops[stage] = cumulativeDrops[stage-1] + stageDrops
		}

		// Create drop node if there are drops
		if cumulativeDrops[stage] > 0 {
			dropNodes[stage] = nodeID

			nodes = append(nodes, Node{
				ID:        nodeID,
				Depth:     int(stage), // Drop nodes appear at the next depth
				Name:      "drop",
				EventType: "DROP",
			})

			// Create links from nodes with drops to the drop node
			for nid, dropCount := range dropsFromNode {
				if dropCount == 0 {
					continue
				}

				percent := math.Round(float64(dropCount)*10000/float64(initialCount)) / 100
				links = append(links, Link{
					Source:        nid,
					Target:        nodeID,
					SessionsCount: int(dropCount),
					Value:         percent,
					EventType:     "DROP",
				})
			}

			// Link previous drop node to carry forward drops
			if stage > 1 && cumulativeDrops[stage-1] > 0 {
				if prevDropID, hasPrevDrop := dropNodes[stage-1]; hasPrevDrop {
					percent := math.Round(float64(cumulativeDrops[stage-1])*10000/float64(initialCount)) / 100
					links = append(links, Link{
						Source:        prevDropID,
						Target:        nodeID,
						SessionsCount: int(cumulativeDrops[stage-1]),
						Value:         percent,
						EventType:     "DROP",
					})
				}
			}

			nodeID++
		}
	}

	// Filter and reindex
	nodeHasConnection := make(map[int]bool)
	for _, link := range links {
		nodeHasConnection[link.Source] = true
		nodeHasConnection[link.Target] = true
	}

	var filteredNodes []Node
	for _, node := range nodes {
		if nodeHasConnection[node.ID] {
			filteredNodes = append(filteredNodes, node)
		}
	}

	// Reassign IDs
	nodeIDMap := make(map[int]int)
	var finalNodes []Node

	for newID, node := range filteredNodes {
		nodeIDMap[node.ID] = newID
		node.ID = newID
		finalNodes = append(finalNodes, node)
	}

	// Update links
	var finalLinks []Link
	for _, link := range links {
		srcID, srcExists := nodeIDMap[link.Source]
		tgtID, tgtExists := nodeIDMap[link.Target]

		if srcExists && tgtExists {
			link.Source = srcID
			link.Target = tgtID
			finalLinks = append(finalLinks, link)
		}
	}

	return JourneyResponse{Data: JourneyData{
		Nodes: finalNodes,
		Links: finalLinks,
	}}, nil
}

func (h UserJourneyQueryBuilder) buildQuery(p Payload) (string, error) {
	events := p.MetricValue
	if len(events) == 0 {
		events = []string{"LOCATION"}
	}
	vals := make([]string, len(events))
	for i, v := range events {
		vals[i] = fmt.Sprintf("'%s'", v)
	}
	laterCond := fmt.Sprintf("e.\"$event_name\" IN (%s)", strings.Join(vals, ","))
	startConds, _ := buildEventConditions(p.StartPoint, BuildConditionsOptions{DefinedColumns: mainColumns, MainTableAlias: "e"})
	excludeConds, _ := buildEventConditions(p.Exclude, BuildConditionsOptions{DefinedColumns: mainColumns, MainTableAlias: "e"})

	firstBase := []string{`e."$event_name" = 'LOCATION'`}
	if len(startConds) > 0 {
		firstBase = append(firstBase, startConds...)
	}
	firstBase = append(firstBase,
		fmt.Sprintf("e.project_id = %d", p.ProjectId),
		"e.session_id IS NOT NULL",
		fmt.Sprintf("e.created_at BETWEEN toDateTime('%s') AND toDateTime('%s')",
			time.Unix(p.StartTimestamp/1000, 0).UTC().Format("2006-01-02 15:04:05"),
			time.Unix(p.EndTimestamp/1000, 0).UTC().Format("2006-01-02 15:04:05"),
		),
	)

	journeyBase := []string{laterCond}
	if len(excludeConds) > 0 {
		journeyBase = append(journeyBase, "NOT ("+strings.Join(excludeConds, " AND "))
	}
	journeyBase = append(journeyBase,
		fmt.Sprintf("e.project_id = %d", p.ProjectId),
	)

	endTime := time.Unix(p.EndTimestamp/1000, 0).UTC().Format("2006-01-02 15:04:05")

	q := fmt.Sprintf(`WITH
  first_hits AS (
    SELECT session_id, MIN(created_at) AS start_time
    FROM product_analytics.events AS e
    WHERE %s
    GROUP BY session_id
  ),
  journey_events AS (
    SELECT
      e.session_id,
      e.distinct_id,
      e."$event_name" AS event_name,
      e.created_at,
      multiIf(
        e."$event_name" = 'LOCATION', JSONExtractString(toString(e."$properties"), 'url_path'),
        e."$event_name" = 'CLICK',    JSONExtractString(toString(e."$properties"), 'label'),
        e."$event_name" = 'INPUT',    JSONExtractString(toString(e."$properties"), 'label'),
        NULL
      ) AS event_property
    FROM product_analytics.events AS e
    JOIN first_hits AS f USING(session_id)
    WHERE
      e.created_at >= f.start_time
      AND e.created_at <= toDateTime('%s')
      AND %s
  ),
  event_with_prev AS (
    SELECT
      session_id,
      distinct_id,
      event_name,
      event_property,
      created_at,
      any(event_name)     OVER (PARTITION BY session_id ORDER BY created_at ROWS BETWEEN 1 PRECEDING AND 1 PRECEDING) AS previous_event_name,
      any(event_property) OVER (PARTITION BY session_id ORDER BY created_at ROWS BETWEEN 1 PRECEDING AND 1 PRECEDING) AS previous_event_property
    FROM journey_events
  ),
  staged AS (
    SELECT
      *,
      sumIf(1, true) OVER (PARTITION BY session_id ORDER BY created_at ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS stage
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
WHERE stage <= %d
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
		p.Columns,
	)
	return q, nil
}
