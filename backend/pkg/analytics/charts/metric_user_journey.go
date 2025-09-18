package charts

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	analyticsConfig "openreplay/backend/internal/config/analytics"
	"openreplay/backend/pkg/logger"
	"slices"
	"sort"
	"strings"
	"time"

	orClickhouse "openreplay/backend/pkg/db/clickhouse"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
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

type SunburstData struct {
	Name     string          `json:"name"`
	Type     string          `json:"type"`
	Depth    uint16          `json:"depth"`
	Value    uint64          `json:"value"`
	Children *[]SunburstData `json:"children"`
}

// JourneyResponse is the API response structure.
type JourneyResponse struct {
	Data JourneyData `json:"data"`
}

type UserJourneyRawData struct {
	EventNumberInSession uint64         `ch:"event_number_in_session" db:"event_number_in_session"`
	EventType            string         `ch:"event_type" db:"event_type"`
	EValue               sql.NullString `ch:"e_value" db:"e_value"`
	NextType             string         `ch:"next_type" db:"next_type"`
	NextValue            sql.NullString `ch:"next_value" db:"next_value"`
	SessionsCount        uint64         `ch:"sessions_count" db:"sessions_count"`
	Value                uint64         `omitempty`
}

var PredefinedJourneys = map[string]map[string]string{
	"LOCATION": {"eventName": "LOCATION", "column": "`$properties`.url_path"},
	"CLICK":    {"eventName": "CLICK", "column": "`$properties`.label"},
	"INPUT":    {"eventName": "INPUT", "column": "`$properties`.label"},
}

type UserJourneyQueryBuilder struct{}

func (h *UserJourneyQueryBuilder) Execute(p *Payload, _conn driver.Conn) (interface{}, error) {
	logr := logger.New()
	cfg := analyticsConfig.New(logr)

	var conn *sqlx.DB = orClickhouse.NewSqlDBConnection(cfg.Clickhouse)
	queries, err := h.buildQuery(p)
	if err != nil {
		return nil, err
	}
	if len(queries) == 0 {
		return nil, fmt.Errorf("No queries to execute for userJourney")
	}

	// Trying to use clickhouseContext in order to keep same session for tmp tables,
	// otherwise we need to use clickhouse.openDB instead of clickhouse.open in the connexion code
	ctx := clickhouse.Context(context.Background(),
		clickhouse.WithSettings(clickhouse.Settings{
			"session_id":      uuid.NewString(),
			"session_timeout": 60, // seconds
		}))

	for i := 0; i < len(queries)-1; i++ {
		//err = conn.Exec(ctx, queries[i])
		_, err = conn.ExecContext(ctx, queries[i])

		if err != nil {
			return nil, fmt.Errorf("error executing tmp query for userJourney: %w", err)
		}
	}
	var rawData []UserJourneyRawData
	//if err = conn.Select(ctx, &rawData, queries[len(queries)-1]); err != nil {
	if err = conn.SelectContext(ctx, &rawData, queries[len(queries)-1]); err != nil {
		log.Printf("Error executing userJourney query: %s\nQuery: %s", err, queries[len(queries)-1])
		return nil, err
	}
	var result interface{}
	if p.ViewType == "sunburst" {
		result, err = h.transformSunburst(rawData)
	} else {
		result, err = h.transformJourney(rawData)
	}
	if err != nil {
		log.Printf("Error transforming userJourney data: %s", err)
		return nil, err
	}
	return result, nil
}

func (h *UserJourneyQueryBuilder) buildQuery(p *Payload) ([]string, error) {
	var subEvents []map[string]string = make([]map[string]string, 0)
	var startPointsConditions []string = make([]string, 0)
	var step0Conditions []string = make([]string, 0)
	var step1PostConditions = []string{fmt.Sprintf("event_number_in_session <= %d", p.Density)}
	var q2ExtraCol string
	var q2ExtraCondition string
	var mainColumn string

	if len(p.MetricValue) == 0 {
		p.MetricValue = append(p.MetricValue, "LOCATION")
		subEvents = append(subEvents, map[string]string{"column": "`$current_path`", "eventType": "LOCATION"})
	} else {
		if len(p.StartPoint) > 0 {
			var extraMetricValues []string
			for _, s := range p.StartPoint {
				if !slices.Contains(p.MetricValue, s.Name) {
					subEvents = append(subEvents, map[string]string{"column": PredefinedJourneys[s.Name]["column"], "eventType": PredefinedJourneys[s.Name]["eventName"]})
					step1PostConditions = append(step1PostConditions, fmt.Sprintf("(`$event_name`='%[1]v' AND event_number_in_session = 1 OR `$event_name`!='%[1]v' AND event_number_in_session > 1)",
						PredefinedJourneys[s.Name]["eventName"]))
					extraMetricValues = append(extraMetricValues, s.Name)
					if q2ExtraCol == "" {
						// This is used in case start event has different type of the visible event,
						// because it causes intermediary events to be removed, so you find a jump from step-0 to step-3
						// because step-2 is not of a visible event
						q2ExtraCol = `,leadInFrame(toNullable(event_number_in_session))
											 OVER (PARTITION BY session_id ORDER BY created_at ASC
											   ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS next_event_number_in_session`
						q2ExtraCondition = "WHERE event_number_in_session + 1 = next_event_number_in_session OR isNull(next_event_number_in_session);"

					}
					p.MetricValue = append(p.MetricValue, extraMetricValues...)
				}
			}

		}
		for _, v := range p.MetricValue {
			if _, ok := PredefinedJourneys[v]; ok {
				subEvents = append(subEvents, map[string]string{"column": PredefinedJourneys[v]["column"], "eventName": PredefinedJourneys[v]["eventName"]})
			}
		}
	}

	if len(subEvents) > 1 {
		var b []string
		for _, v := range subEvents[:len(subEvents)-1] {
			b = append(b, fmt.Sprintf("`$event_name`='%s',%s", v["eventType"], v["column"]))
		}

		mainColumn = fmt.Sprintf("multiIf(%s,%s)", strings.Join(b, ","), subEvents[len(subEvents)-1]["column"])
	} else if len(subEvents) == 1 {
		mainColumn = subEvents[0]["column"]
	}

	step0Conditions, _ = BuildEventConditions(p.StartPoint, BuildConditionsOptions{DefinedColumns: mainColumns, MainTableAlias: "e"})

	if len(startPointsConditions) > 0 {
		startPointsConditions = []string{fmt.Sprintf("(%s)", strings.Join(startPointsConditions, " OR "))}
		startPointsConditions = append(startPointsConditions, fmt.Sprintf("events.project_id = toUInt16(%d)", p.ProjectId))
		startPointsConditions = append(startPointsConditions, fmt.Sprintf("events.created_at >= toDateTime(%d / 1000)", p.StartTimestamp))
		startPointsConditions = append(startPointsConditions, fmt.Sprintf("events.created_at < toDateTime(%d / 1000)", p.EndTimestamp))
		step0Conditions = []string{fmt.Sprintf("(%s)", strings.Join(step0Conditions, " OR "))}
		step0Conditions = append(step0Conditions, "pre_ranked_events.event_number_in_session = 1")
	}

	var exclusions = make(map[string][]string)
	for _, ef := range p.Exclude {
		if len(ef.Value) == 0 {
			continue
		}
		if slices.Contains(p.MetricValue, ef.Name) {
			op, ok := compOps[ef.Operator]
			if !ok {
				return nil, fmt.Errorf("unknown operator: %s", ef.Operator)
			}
			op = reverseSqlOperator(op)
			exclusions[ef.Name] = []string{fmt.Sprintf("`$event_name` %s '%s'", op, ef.Name)}
		}
	}
	_, sessionsConditions := BuildEventConditions(p.Series[0].Filter.Filters, BuildConditionsOptions{DefinedColumns: mainSessionsColumns, MainTableAlias: "sessions"})
	chSubQuery := []string{fmt.Sprintf("events.project_id = toUInt16(%d)", p.ProjectId),
		fmt.Sprintf("events.created_at >= toDateTime(%d / 1000)", p.StartTimestamp),
		fmt.Sprintf("events.created_at < toDateTime(%d / 1000)", p.EndTimestamp)}
	selectedEventTypeSubQuery := make([]string, 0)
	for _, s := range p.MetricValue {
		if _, ok := PredefinedJourneys[s]; ok {
			selectedEventTypeSubQuery = append(selectedEventTypeSubQuery, fmt.Sprintf("events.`$event_name` = '%s'", PredefinedJourneys[s]["eventName"]))
		} else {
			selectedEventTypeSubQuery = append(selectedEventTypeSubQuery, fmt.Sprintf("events.`$event_name` = '%s'", s))
		}
		if _, ok := exclusions[s]; ok {
			selectedEventTypeSubQuery[len(selectedEventTypeSubQuery)-1] += fmt.Sprintf(" AND (%s)", strings.Join(exclusions[s], " AND "))
		}
	}
	//    selected_event_type_sub_query = " OR ".join(selected_event_type_sub_query)
	chSubQuery = append(chSubQuery, fmt.Sprintf("(%s)", strings.Join(selectedEventTypeSubQuery, " OR ")))

	mainSessionsTable := getMainSessionsTable(p.StartTimestamp) + " AS sessions"
	mainEventsTable := getMainEventsTable(p.StartTimestamp) + " AS events"
	initialSessionsCte := ""
	if len(sessionsConditions) > 0 {
		sessionsConditions = append(sessionsConditions, fmt.Sprintf("sessions.project_id = toUInt16(%d)", p.ProjectId))
		sessionsConditions = append(sessionsConditions, fmt.Sprintf("sessions.datetime >= toDateTime(%d / 1000)", p.StartTimestamp))
		sessionsConditions = append(sessionsConditions, fmt.Sprintf("sessions.datetime < toDateTime(%d / 1000)", p.EndTimestamp))
		sessionsConditions = append(sessionsConditions, "sessions.events_count > 1")
		sessionsConditions = append(sessionsConditions, "sessions.duration > 0")
		initialSessionsCte = fmt.Sprintf("sub_sessions AS (SELECT DISTINCT session_id FROM %s WHERE %s),",
			mainSessionsTable, strings.Join(sessionsConditions, " AND "))
	}
	var step0SubQuery, initialEventCTE string
	if len(startPointsConditions) == 0 {
		step0SubQuery = `SELECT DISTINCT session_id
		                 FROM (SELECT "$event_name", e_value
		                       FROM pre_ranked_events
		                       WHERE event_number_in_session = 1
		                       GROUP BY "$event_name", e_value
		                       ORDER BY count(1) DESC LIMIT 1) AS top_start_events
		                          INNER JOIN pre_ranked_events
		                                     ON (top_start_events."$event_name" = pre_ranked_events."$event_name" 
													AND top_start_events.e_value = pre_ranked_events.e_value)
		                 WHERE pre_ranked_events.event_number_in_session = 1`
		initialEventCTE = ""
	} else {
		step0SubQuery = fmt.Sprintf(`SELECT DISTINCT session_id
		                    FROM pre_ranked_events
		                    WHERE %s`, strings.Join(step0Conditions, " AND "))
		var joinSessions string
		if len(sessionsConditions) > 0 {
			joinSessions = "INNER JOIN sub_sessions USING (session_id)"
		}
		initialEventCTE = fmt.Sprintf(`initial_event AS (SELECT events.session_id, MIN(created_at) AS start_event_timestamp
		                  FROM %s %s WHERE %s GROUP BY 1),`, mainEventsTable, joinSessions, strings.Join(startPointsConditions, " AND "))
		chSubQuery = append(chSubQuery, "events.created_at >= initial_event.start_event_timestamp")
		mainEventsTable += " INNER JOIN initial_event ON (events.session_id = initial_event.session_id)"
		sessionsConditions = []string{}
	}
	var stepsQuery []string = make([]string, 0)
	var dropQuery []string = make([]string, 0)
	var topQuery []string = make([]string, 0)
	var topWithNextQuery []string = make([]string, 0)
	var otherQuery []string = make([]string, 0)
	for i := 1; i < p.Density+1; i++ {
		stepsQuery = append(stepsQuery,
			fmt.Sprintf(`n%[1]v AS (SELECT event_number_in_session,
		                                          "$event_name",
		                                          e_value,
		                                          next_type,
		                                          next_value,
		                                          COUNT(1) AS sessions_count
		                                   FROM ranked_events
		                                   WHERE event_number_in_session = %[1]v
		                                   GROUP BY event_number_in_session, "$event_name", e_value, next_type, next_value
		                                   ORDER BY sessions_count DESC)`, i))

		topQuery = append(topQuery,
			fmt.Sprintf(`SELECT event_number_in_session,
		                                   "$event_name",
		                                   e_value,
		                                   SUM(n%[1]v.sessions_count) AS sessions_count
		                            FROM n%[1]v
		                            GROUP BY event_number_in_session, "$event_name", e_value
		                            ORDER BY sessions_count DESC
		                            LIMIT %v`, i, p.Rows))
		if i < p.Density {
			dropQuery = append(dropQuery,
				fmt.Sprintf(`SELECT event_number_in_session,
											"$event_name",
											e_value,
											'DROP' AS next_type,
											NULL   AS next_value,
											sessions_count
									 FROM n%[1]v
									 WHERE isNull(n%[1]v.next_type)`, i))
			topWithNextQuery = append(topWithNextQuery,
				fmt.Sprintf(`SELECT n%[1]v.*
									FROM n%[1]v
										 INNER JOIN top_n
											 ON (n%[1]v.event_number_in_session = top_n.event_number_in_session
												 AND n%[1]v."$event_name" = top_n."$event_name"
												 AND n%[1]v.e_value = top_n.e_value)`, i))
		}

		if i > 1 {
			otherQuery = append(otherQuery,
				fmt.Sprintf(`SELECT n%[1]v.*
									FROM n%[1]v
									WHERE (event_number_in_session, "$event_name", e_value) NOT IN
										  (SELECT event_number_in_session, "$event_name", e_value
										   FROM top_n
										   WHERE top_n.event_number_in_session = %[1]v)`, i))
		}
	}

	tableKey := fmt.Sprintf("%d", time.Now().UnixMilli())
	var joinSessions string
	if len(sessionsConditions) > 0 {
		joinSessions = "INNER JOIN sub_sessions ON (sub_sessions.session_id = events.session_id)"
	} else {
		joinSessions = ""
	}

	q1 := fmt.Sprintf(`-- Q1:
CREATE TEMPORARY TABLE pre_ranked_events_%[1]v AS
WITH %s
	 %s
	 pre_ranked_events AS (SELECT *
						   FROM (SELECT session_id,
										"$event_name",
										created_at,
										toString(%s) AS e_value,
										row_number() OVER (PARTITION BY session_id
 														   ORDER BY created_at ASC, event_id ASC) AS event_number_in_session
	                                FROM %s %s
	                                WHERE %s
	                                ) AS full_ranked_events
	                          WHERE %s)
SELECT *
FROM pre_ranked_events;`,
		tableKey,
		initialSessionsCte,
		initialEventCTE,
		mainColumn,
		mainEventsTable,
		joinSessions,
		strings.Join(chSubQuery, " AND "),
		strings.Join(step1PostConditions, " AND "),
	)

	q2 := fmt.Sprintf(`-- Q2:
CREATE TEMPORARY TABLE ranked_events_%[1]v AS
WITH pre_ranked_events AS (SELECT *
						   FROM pre_ranked_events_%[1]v),
								start_points AS (%s),
								ranked_events AS (SELECT pre_ranked_events.*,
														 leadInFrame(e_value)
																	 OVER (PARTITION BY session_id ORDER BY created_at ASC
																	   ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS next_value,
														 leadInFrame(toNullable("$event_name"))
																	 OVER (PARTITION BY session_id ORDER BY created_at ASC
																	   ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS next_type
														 %s
												  FROM start_points INNER JOIN pre_ranked_events USING (session_id))
							SELECT *
							FROM ranked_events
							%s;`,
		tableKey,
		step0SubQuery,
		q2ExtraCol,
		q2ExtraCondition,
	)

	q3 := fmt.Sprintf(`-- Q3:
WITH ranked_events AS (SELECT *
					   FROM ranked_events_%[1]v),
	               	   %s,
     drop_n AS (%s),
     top_n AS (%s),
     top_n_with_next AS (%s),
     others_n AS (%s)
SELECT event_number_in_session,
	  "$event_name" AS event_type,
	  e_value,
	  next_type,
	  next_value,
	  sessions_count
FROM (
  -- Top to Top: valid
  SELECT top_n_with_next.*
  FROM top_n_with_next
		   INNER JOIN top_n
					  ON (top_n_with_next.event_number_in_session + 1 =
						  top_n.event_number_in_session
						  AND top_n_with_next.next_type = top_n."$event_name"
						  AND top_n_with_next.next_value = top_n.e_value)
  UNION ALL
  -- Top to Others: valid
  SELECT top_n_with_next.event_number_in_session,
		 top_n_with_next."$event_name",
		 top_n_with_next.e_value,
		 'OTHER'                             AS next_type,
		 NULL                                AS next_value,
		 SUM(top_n_with_next.sessions_count) AS sessions_count
  FROM top_n_with_next
  WHERE (top_n_with_next.event_number_in_session + 1, top_n_with_next.next_type,
		 top_n_with_next.next_value) IN
		(SELECT others_n.event_number_in_session, others_n."$event_name", others_n.e_value
		 FROM others_n)
  GROUP BY top_n_with_next.event_number_in_session, top_n_with_next."$event_name",
		   top_n_with_next.e_value
  UNION ALL
  -- Top go to Drop: valid
  SELECT drop_n.event_number_in_session,
		 drop_n."$event_name",
		 drop_n.e_value,
			 drop_n.next_type,
		 drop_n.next_value,
		 drop_n.sessions_count
  FROM drop_n
		   INNER JOIN top_n
					  ON (drop_n.event_number_in_session = top_n.event_number_in_session
						  AND drop_n."$event_name" = top_n."$event_name"
						  AND drop_n.e_value = top_n.e_value)
  ORDER BY drop_n.event_number_in_session UNION ALL
  -- Others got to Drop: valid
  SELECT others_n.event_number_in_session,
		 'OTHER'                      AS "$event_name",
		 NULL                         AS e_value,
		 'DROP'                       AS next_type,
		 NULL                         AS next_value,
		 SUM(others_n.sessions_count) AS sessions_count
  FROM others_n
  WHERE isNull(others_n.next_type)
	AND others_n.event_number_in_session < 3
  GROUP BY others_n.event_number_in_session, next_type, next_value
  UNION ALL
  -- Others got to Top:valid
  SELECT others_n.event_number_in_session,
		 'OTHER'                      AS "$event_name",
		 NULL                         AS e_value,
		 others_n.next_type,
		 others_n.next_value,
		 SUM(others_n.sessions_count) AS sessions_count
  FROM others_n
  WHERE isNotNull(others_n.next_type)
	AND (others_n.event_number_in_session + 1, others_n.next_type, others_n.next_value) IN
		(SELECT top_n.event_number_in_session, top_n."$event_name", top_n.e_value
			 FROM top_n)
  GROUP BY others_n.event_number_in_session, others_n.next_type, others_n.next_value
  UNION ALL
  -- Others got to Others
  SELECT others_n.event_number_in_session,
		 'OTHER'                      AS "$event_name",
		 NULL                         AS e_value,
		 'OTHER'                      AS next_type,
		 NULL                         AS next_value,
		 SUM(others_n.sessions_count) AS sessions_count
  FROM others_n
  WHERE isNotNull(others_n.next_type)
	AND others_n.event_number_in_session < %d
	AND (others_n.event_number_in_session + 1, others_n.next_type,
		 others_n.next_value) NOT IN
		(SELECT event_number_in_session, "$event_name", e_value FROM top_n)
  GROUP BY others_n.event_number_in_session
) AS chart_steps
ORDER BY event_number_in_session, sessions_count DESC;
`,
		tableKey,
		strings.Join(stepsQuery, ", "),
		strings.Join(dropQuery, " UNION ALL "),
		strings.Join(topQuery, " UNION ALL "),
		strings.Join(topWithNextQuery, " UNION ALL "),
		strings.Join(otherQuery, " UNION ALL "),
		p.Density,
	)

	return []string{q1, q2, q3}, nil
}

func (h *UserJourneyQueryBuilder) transformJourney(rows []UserJourneyRawData) (JourneyData, error) {
	var total100p uint64
	for _, r := range rows {
		if r.EventNumberInSession > 1 {
			break
		}
		total100p += r.SessionsCount
	}
	type drop struct {
		depth         int
		sessionsCount uint64
	}
	var nodes []string = make([]string, 0)
	var nodesValues []Node = make([]Node, 0)
	var links []Link = make([]Link, 0)
	var drops []drop = make([]drop, 0)
	var maxDepth int = 0
	for _, r := range rows {
		r.Value = r.SessionsCount * 100 / total100p
		source := fmt.Sprintf("%d_%s_%s", r.EventNumberInSession-1, r.EventType, r.EValue.String)
		if !slices.Contains(nodes, source) {
			nodes = append(nodes, source)
			nodesValues = append(nodesValues, Node{
				Depth:        int(r.EventNumberInSession - 1),
				Name:         r.EValue.String,
				EventType:    r.EventType,
				ID:           len(nodesValues),
				StartingNode: r.EventNumberInSession == 1,
			})
		}
		target := fmt.Sprintf("%d_%s_%s", r.EventNumberInSession, r.NextType, r.NextValue.String)
		if !slices.Contains(nodes, target) {
			nodes = append(nodes, target)
			nodesValues = append(nodesValues, Node{
				Depth:        int(r.EventNumberInSession),
				Name:         r.NextValue.String,
				EventType:    r.NextType,
				ID:           len(nodesValues),
				StartingNode: false,
			})
		}

		var srcIdx int = slices.Index(nodes, source)
		var tgIdx int = slices.Index(nodes, target)
		var link Link = Link{
			EventType:     r.EventType,
			SessionsCount: int(r.SessionsCount),
			Value:         float64(r.Value),
			Source:        srcIdx,
			Target:        tgIdx,
		}
		links = append(links, link)
		maxDepth = int(r.EventNumberInSession)
		if r.NextType == "DROP" {
			var d drop
			var broke bool = false
			for _, d = range drops {
				if d.depth == int(r.EventNumberInSession) {
					d.sessionsCount += r.SessionsCount
					broke = true
					break
				}
			}
			if !broke {
				drops = append(drops, drop{
					depth:         int(r.EventNumberInSession),
					sessionsCount: r.SessionsCount,
				})
			}
		}
	}

	for i := range drops {
		if drops[i].depth < maxDepth {
			source := fmt.Sprintf("%d_DROP_", drops[i].depth)
			target := fmt.Sprintf("%d_DROP_", drops[i].depth+1)
			srIdx := slices.Index(nodes, source)
			var tgIdx int
			if i < len(drops)-1 && drops[i].depth+1 == drops[i+1].depth {
				tgIdx = slices.Index(nodes, target)
			} else {
				nodes = append(nodes, target)
				nodesValues = append(nodesValues, Node{
					Depth:     drops[i].depth + 1,
					Name:      "None",
					EventType: "DROP",
					ID:        len(nodesValues),
				})
				tgIdx = len(nodes) - 1
			}

			link := Link{
				EventType:     "DROP",
				SessionsCount: int(drops[i].sessionsCount),
				Value:         float64(drops[i].sessionsCount) * 100 / float64(total100p),
				Source:        srIdx,
				Target:        tgIdx,
			}
			links = append(links, link)
		}
	}
	sort.Slice(links, func(i, j int) bool {
		return links[i].Source < links[j].Source || (links[i].Source == links[j].Source && links[i].Target < links[j].Target)
	})
	return JourneyData{Nodes: nodesValues, Links: links}, nil
}

func (h *UserJourneyQueryBuilder) transformSunburst(rows []UserJourneyRawData) ([]SunburstData, error) {
	var getAllFromCurrentLevel = func(element SunburstData, levels []SunburstData) []SunburstData {
		var result []SunburstData = make([]SunburstData, 0)
		for _, l := range levels {
			if element.Depth == l.Depth && element.Name == l.Name && element.Type == l.Type {
				result = append(result, l)
			}
		}
		return result
	}

	var sumValues = func(children []SunburstData) uint64 {
		var result uint64 = 0
		for _, c := range children {
			result += c.Value
		}
		return result
	}

	var response []SunburstData = make([]SunburstData, 0)
	var levels []SunburstData = make([]SunburstData, 0)
	var depth uint64 = 1
	for _, r := range rows {
		if r.EventNumberInSession > 2 {
			break
		}
		var children = &response
		var currentElement = SunburstData{
			Name:     r.EValue.String,
			Type:     r.EventType,
			Depth:    uint16(r.EventNumberInSession),
			Value:    0,
			Children: &[]SunburstData{}}
		if r.EventNumberInSession > depth {
			depth += 1
		}

		var savedElements []SunburstData = getAllFromCurrentLevel(currentElement, levels)
		if len(savedElements) == 0 {
			*children = append(*children, currentElement)
			children = &[]SunburstData{currentElement}
			levels = append(levels, (*children)[0])
		} else {
			children = &savedElements
		}

		depth += 1
		currentElement = SunburstData{
			Name:     r.NextValue.String,
			Type:     r.NextType,
			Depth:    uint16(r.EventNumberInSession + 1),
			Value:    r.SessionsCount,
			Children: &[]SunburstData{},
		}
		for _, c := range *children {
			savedElements = getAllFromCurrentLevel(currentElement, *c.Children)
			if len(savedElements) == 0 {
				*c.Children = append(*c.Children, currentElement)
				levels = append(levels, (*c.Children)[len(*c.Children)-1])
			} else {
				for _, sc := range savedElements {
					sc.Value += r.SessionsCount
				}
			}
		}
		depth -= 1
	}

	// Count the value of the initial nodes
	for i, _ := range response {
		response[i].Value = sumValues(*response[i].Children)
	}
	return response, nil
}
