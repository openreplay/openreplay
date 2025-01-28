package main

import (
	"encoding/json"
	"fmt"
	"strings"
)

func main() {
	var r Root
	err := json.Unmarshal([]byte(jsonInput), &r)
	if err != nil {
		panic(err)
	}

	//fmt.Println("ARGS:", r)
	fmt.Println(buildQuery(r))
	//fmt.Println("QUERY PART:", qp)
}

type Table string
type Column string
type FilterType string
type EventOrder string
type FetchFilterType string

const (
	UserOs             FilterType = "userOs"
	UserBrowser        FilterType = "userBrowser"
	UserDevice         FilterType = "userDevice"
	UserCountry        FilterType = "userCountry"
	UserCity           FilterType = "userCity"
	UserState          FilterType = "userState"
	UserId             FilterType = "userId"
	UserAnonymousId    FilterType = "userAnonymousId"
	Referrer           FilterType = "referrer"
	RevId              FilterType = "revId"
	UserOsIos          FilterType = "userOsIos"
	UserDeviceIos      FilterType = "userDeviceIos"
	UserCountryIos     FilterType = "userCountryIos"
	UserIdIos          FilterType = "userIdIos"
	UserAnonymousIdIos FilterType = "userAnonymousIdIos"
	RevIdIos           FilterType = "revIdIos"
	Duration           FilterType = "duration"
	Platform           FilterType = "platform"
	Metadata           FilterType = "metadata"
	Issue              FilterType = "issue"
	EventsCount        FilterType = "eventsCount"
	UtmSource          FilterType = "utmSource"
	UtmMedium          FilterType = "utmMedium"
	UtmCampaign        FilterType = "utmCampaign"
	ThermalState       FilterType = "thermalState"
	MainThreadCPU      FilterType = "mainThreadCPU"
	ViewComponent      FilterType = "viewComponent"
	LogEvent           FilterType = "logEvent"
	ClickEvent         FilterType = "clickEvent"
	MemoryUsage        FilterType = "memoryUsage"
)

const (
	Click         FilterType = "click"
	Input         FilterType = "input"
	Location      FilterType = "location"
	Custom        FilterType = "custom"
	Request       FilterType = "request"
	Fetch         FilterType = "fetch"
	GraphQL       FilterType = "graphql"
	StateAction   FilterType = "stateAction"
	Error         FilterType = "error"
	Tag           FilterType = "tag"
	ClickMobile   FilterType = "clickMobile"
	InputMobile   FilterType = "inputMobile"
	ViewMobile    FilterType = "viewMobile"
	CustomMobile  FilterType = "customMobile"
	RequestMobile FilterType = "requestMobile"
	ErrorMobile   FilterType = "errorMobile"
	SwipeMobile   FilterType = "swipeMobile"
)

const (
	EventOrderThen EventOrder = "then"
	EventOrderOr   EventOrder = "or"
	EventOrderAnd  EventOrder = "and"
)

const (
	FetchFilterTypeFetchUrl          FilterType = "fetchUrl"
	FetchFilterTypeFetchStatusCode   FilterType = "fetchStatusCode"
	FetchFilterTypeFetchMethod       FilterType = "fetchMethod"
	FetchFilterTypeFetchDuration     FilterType = "fetchDuration"
	FetchFilterTypeFetchRequestBody  FilterType = "fetchRequestBody"
	FetchFilterTypeFetchResponseBody FilterType = "fetchResponseBody"
)

const (
	OperatorStringIs          = "is"
	OperatorStringIsAny       = "isAny"
	OperatorStringOn          = "on"
	OperatorStringOnAny       = "onAny"
	OperatorStringIsNot       = "isNot"
	OperatorStringIsUndefined = "isUndefined"
	OperatorStringNotOn       = "notOn"
	OperatorStringContains    = "contains"
	OperatorStringNotContains = "notContains"
	OperatorStringStartsWith  = "startsWith"
	OperatorStringEndsWith    = "endsWith"
)

const (
	OperatorMathEq = "="
	OperatorMathLt = "<"
	OperatorMathGt = ">"
	OperatorMathLe = "<="
	OperatorMathGe = ">="
)

//--------------------------------------------------
// Constants for columns, tables, etc.
//--------------------------------------------------

const (
	TableEvents   Table = "product_analytics.events"
	TableSessions Table = "experimental.sessions"

	ColEventTime       Column = "main.created_at"
	ColEventName       Column = "main.`$event_name`"
	ColEventProjectID  Column = "main.project_id"
	ColEventProperties Column = "main.`$properties`"
	ColEventSessionID  Column = "main.session_id"
	ColEventURLPath    Column = "main.url_path"
	ColEventStatus     Column = "main.status"

	ColSessionID        Column = "s.session_id"
	ColDuration         Column = "s.duration"
	ColUserCountry      Column = "s.user_country"
	ColUserCity         Column = "s.user_city"
	ColUserState        Column = "s.user_state"
	ColUserID           Column = "s.user_id"
	ColUserAnonymousID  Column = "s.user_anonymous_id"
	ColUserOS           Column = "s.user_os"
	ColUserBrowser      Column = "s.user_browser"
	ColUserDevice       Column = "s.user_device"
	ColUserDeviceType   Column = "s.user_device_type"
	ColRevID            Column = "s.rev_id"
	ColBaseReferrer     Column = "s.base_referrer"
	ColUtmSource        Column = "s.utm_source"
	ColUtmMedium        Column = "s.utm_medium"
	ColUtmCampaign      Column = "s.utm_campaign"
	ColMetadata1        Column = "s.metadata_1"
	ColSessionProjectID Column = "s.project_id"
	ColSessionIsNotNull Column = "isNotNull(s.duration)"
)

type Root struct {
	StartTimestamp int64    `json:"startTimestamp"`
	EndTimestamp   int64    `json:"endTimestamp"`
	Series         []Series `json:"series"`
}

type Series struct {
	SeriesID int64        `json:"seriesId"`
	Name     string       `json:"name"`
	Filter   SeriesFilter `json:"filter"`
}

type SeriesFilter struct {
	Filters     []FilterObj `json:"filters"`
	EventsOrder EventOrder  `json:"eventsOrder"`
}

type FilterObj struct {
	Type     FilterType  `json:"type"`
	IsEvent  bool        `json:"isEvent"`
	Value    []string    `json:"value"`
	Operator string      `json:"operator"`
	Source   string      `json:"source"`
	Filters  []FilterObj `json:"filters"`
}

// --------------------------------------------------
func buildQuery(r Root) string {
	s := r.Series[0]

	// iterate over series and partition filters
	//for _, s := range r.Series {
	//	sessionFilters, eventFilters := partitionFilters(s.Filter.Filters)
	//	sessionWhere := buildSessionWhere(sessionFilters)
	//	eventWhere, seqHaving := buildEventsWhere(eventFilters, s.Filter.EventsOrder)
	//	fmt.Println("SESSION FILTERS:", sessionFilters)
	//	fmt.Println("EVENT FILTERS:", eventFilters)
	//	fmt.Println("SESSION WHERE:", sessionWhere)
	//	fmt.Println("EVENT WHERE:", eventWhere)
	//	fmt.Println("SEQ HAVING:", seqHaving)
	//}

	sessionFilters, eventFilters := partitionFilters(s.Filter.Filters)
	sessionWhere := buildSessionWhere(sessionFilters)
	eventWhere, seqHaving := buildEventsWhere(eventFilters, s.Filter.EventsOrder)

	subQuery := fmt.Sprintf(
		"SELECT %s,\n"+
			"       MIN(%s) AS first_event_ts,\n"+
			"       MAX(%s) AS last_event_ts\n"+
			"FROM %s AS main\n"+
			"WHERE main.project_id = %%(project_id)s\n"+
			"  AND %s >= toDateTime(%%(start_time)s/1000)\n"+
			"  AND %s <= toDateTime(%%(end_time)s/1000)\n"+
			"  AND (%s)\n"+
			"GROUP BY %s\n"+
			"HAVING %s",
		ColEventSessionID,
		ColEventTime,
		ColEventTime,
		TableEvents,
		ColEventTime,
		ColEventTime,
		strings.Join(eventWhere, " OR "),
		ColEventSessionID,
		seqHaving,
	)

	joinQuery := fmt.Sprintf(
		"SELECT *\n"+
			"FROM %s AS s\n"+
			"INNER JOIN (\n"+
			"    SELECT DISTINCT ev.session_id, ev.`$current_url` AS url_path\n"+
			"    FROM %s AS ev\n"+
			"    WHERE ev.created_at >= toDateTime(%%(start_time)s/1000)\n"+
			"      AND ev.created_at <= toDateTime(%%(end_time)s/1000)\n"+
			"      AND ev.project_id = %%(project_id)s\n"+
			"      AND ev.`$event_name` = 'LOCATION'\n"+
			") AS extra_event USING (session_id)\n"+
			"WHERE s.project_id = %%(project_id)s\n"+
			"  AND %s\n"+
			"  AND s.datetime >= toDateTime(%%(start_time)s/1000)\n"+
			"  AND s.datetime <= toDateTime(%%(end_time)s/1000)\n",
		TableSessions,
		TableEvents,
		ColSessionIsNotNull,
	)

	if len(sessionWhere) > 0 {
		joinQuery += "  AND " + strings.Join(sessionWhere, " AND ") + "\n"
	}

	main := fmt.Sprintf(
		"SELECT s.session_id AS session_id, s.url_path\n"+
			"FROM (\n%s\n) AS f\n"+
			"INNER JOIN (\n%s) AS s\n"+
			"  ON (s.session_id = f.session_id)\n",
		subQuery,
		joinQuery,
	)

	final := fmt.Sprintf(
		"SELECT COUNT(DISTINCT url_path) OVER () AS main_count,\n"+
			"       url_path AS name,\n"+
			"       COUNT(DISTINCT session_id) AS total,\n"+
			"       COALESCE(SUM(COUNT(DISTINCT session_id)) OVER (), 0) AS total_count\n"+
			"FROM (\n%s) AS filtered_sessions\n"+
			"GROUP BY url_path\n"+
			"ORDER BY total DESC\n"+
			"LIMIT 200 OFFSET 0;",
		main,
	)

	return final
}

func partitionFilters(filters []FilterObj) (sessionFilters, eventFilters []FilterObj) {
	for _, f := range filters {
		if f.IsEvent {
			eventFilters = append(eventFilters, f)
		} else {
			sessionFilters = append(sessionFilters, f)
		}
	}
	return
}

func buildSessionWhere(filters []FilterObj) []string {
	var conds []string
	for _, f := range filters {
		switch f.Type {
		case UserCountry:
			conds = append(conds, fmt.Sprintf("%s = toString('%s')", ColUserCountry, concatValues(f.Value)))
		case UserCity:
			conds = append(conds, fmt.Sprintf("%s = toString('%s')", ColUserCity, concatValues(f.Value)))
		case UserState:
			conds = append(conds, fmt.Sprintf("%s = toString('%s')", ColUserState, concatValues(f.Value)))
		case UserId:
			conds = append(conds, fmt.Sprintf("%s = toString('%s')", ColUserID, concatValues(f.Value)))
		case UserAnonymousId:
			conds = append(conds, fmt.Sprintf("%s = toString('%s')", ColUserAnonymousID, concatValues(f.Value)))
		case UserOs:
			conds = append(conds, fmt.Sprintf("%s = toString('%s')", ColUserOS, concatValues(f.Value)))
		case UserBrowser:
			conds = append(conds, fmt.Sprintf("%s = toString('%s')", ColUserBrowser, concatValues(f.Value)))
		case UserDevice:
			conds = append(conds, fmt.Sprintf("%s = toString('%s')", ColUserDevice, concatValues(f.Value)))
		case Platform:
			conds = append(conds, fmt.Sprintf("%s = toString('%s')", ColUserDeviceType, concatValues(f.Value)))
		case RevId:
			conds = append(conds, fmt.Sprintf("%s = toString('%s')", ColRevID, concatValues(f.Value)))
		case Referrer:
			conds = append(conds, fmt.Sprintf("%s = toString('%s')", ColBaseReferrer, concatValues(f.Value)))
		case Duration:
			if len(f.Value) == 2 {
				conds = append(conds, fmt.Sprintf("%s >= '%s'", ColDuration, f.Value[0]))
				conds = append(conds, fmt.Sprintf("%s <= '%s'", ColDuration, f.Value[1]))
			}
		case UtmSource:
			conds = append(conds, fmt.Sprintf("%s = toString('%s')", ColUtmSource, concatValues(f.Value)))
		case UtmMedium:
			conds = append(conds, fmt.Sprintf("%s = toString('%s')", ColUtmMedium, concatValues(f.Value)))
		case UtmCampaign:
			conds = append(conds, fmt.Sprintf("%s = toString('%s')", ColUtmCampaign, concatValues(f.Value)))
		case Metadata:
			conds = append(conds, fmt.Sprintf("%s = toString('%s')", ColMetadata1, concatValues(f.Value)))
		}
	}
	// add /n to each condition
	for i := range conds {
		conds[i] += "\n"
	}
	return conds
}

func parseOperator(op string) string {
	switch strings.ToLower(op) {
	case OperatorStringContains:
		return OperatorMathEq // interpret as "LIKE" if needed
	case OperatorStringIs, OperatorStringOn, "=", OperatorStringOnAny:
		return OperatorMathEq
	case OperatorStringStartsWith:
		// might interpret differently in real impl
		return OperatorMathEq
	case OperatorStringEndsWith:
		// might interpret differently in real impl
		return OperatorMathEq
	default:
		return OperatorMathEq
	}
}

func buildEventsWhere(filters []FilterObj, order EventOrder) (eventConditions []string, having string) {
	basicEventTypes := "(" +
		strings.Join([]string{
			fmt.Sprintf("%s = 'CLICK'", ColEventName),
			fmt.Sprintf("%s = 'INPUT'", ColEventName),
			fmt.Sprintf("%s = 'LOCATION'", ColEventName),
			fmt.Sprintf("%s = 'CUSTOM'", ColEventName),
			fmt.Sprintf("%s = 'REQUEST'", ColEventName),
		}, " OR ") + ")"

	var seq []string
	for _, f := range filters {
		switch f.Type {
		case Click:
			seq = append(seq, seqCond("CLICK", "selector", f))
		case Input:
			seq = append(seq, seqCond("INPUT", "label", f))
		case Location:
			seq = append(seq, seqCond("LOCATION", "url_path", f))
		case Custom:
			seq = append(seq, seqCond("CUSTOM", "name", f))
		case Fetch:
			seq = append(seq, seqFetchCond("REQUEST", f))
		case FetchFilterTypeFetchStatusCode:
			seq = append(seq, seqCond("REQUEST", "status", f))
		default:
			seq = append(seq, fmt.Sprintf("(%s = '%s')", ColEventName, strings.ToUpper(string(f.Type))))
		}
	}
	eventConditions = []string{basicEventTypes}

	// then => sequenceMatch
	// or => OR
	// and => AND
	switch order {
	case EventOrderThen:
		var pattern []string
		for i := range seq {
			pattern = append(pattern, fmt.Sprintf("(?%d)", i+1))
		}
		having = fmt.Sprintf("sequenceMatch('%s')(\n%s,\n%s)",
			strings.Join(pattern, ""), fmt.Sprintf("toUnixTimestamp(%s)", ColEventTime), strings.Join(seq, ",\n"))
	case EventOrderAnd:
		// build AND
		having = strings.Join(seq, " AND ")
	default:
		// default => OR
		var orParts []string
		for _, p := range seq {
			orParts = append(orParts, "("+p+")")
		}
		having = strings.Join(orParts, " OR ")
	}
	return
}

func seqCond(eventName, key string, f FilterObj) string {
	op := parseOperator(f.Operator)
	return fmt.Sprintf("(%s = '%s' AND JSONExtractString(toString(%s), '%s') %s '%s')",
		ColEventName, strings.ToUpper(eventName), ColEventProperties, key, op, concatValues(f.Value))
}

func seqFetchCond(eventName string, f FilterObj) string {
	w := []string{fmt.Sprintf("(%s = '%s')", ColEventName, strings.ToUpper(eventName))}
	var extras []string
	for _, c := range f.Filters {
		switch c.Type {
		case Fetch:
			if len(c.Value) > 0 {
				extras = append(extras, fmt.Sprintf("(%s = '%s')", ColEventURLPath, concatValues(c.Value)))
			}
		case FetchFilterTypeFetchStatusCode:
			if len(c.Value) > 0 {
				extras = append(extras, fmt.Sprintf("(%s = '%s')", ColEventStatus, concatValues(c.Value)))
			}
		default:
			// placeholder if needed
		}
	}
	if len(extras) > 0 {
		w = append(w, strings.Join(extras, " AND "))
	}
	return "(" + strings.Join(w, " AND ") + ")"
}

func concatValues(v []string) string {
	return strings.Join(v, "")
}

const jsonInput = `
{
    "startTimestamp": 1737043724664,
    "endTimestamp": 1737130124664,
    "series": [
        {
            "seriesId": 610,
            "name": "Series 1",
            "filter": {
                "filters": [
                    {
                        "type": "click",
                        "isEvent": true,
                        "value": ["DEPLOYMENT"],
                        "operator": "on",
                        "filters": []
                    },
                    {
                        "type": "input",
                        "isEvent": true,
                        "value": ["a"],
                        "operator": "contains",
                        "filters": []
                    },
                    {
                        "type": "location",
                        "isEvent": true,
                        "value": ["/en/using-or/"],
                        "operator": "is",
                        "filters": []
                    },
                    {
                        "type": "userCountry",
                        "isEvent": false,
                        "value": ["AD"],
                        "operator": "is",
                        "filters": []
                    },
                    {
                        "type": "userCity",
                        "isEvent": false,
                        "value": ["Mumbai"],
                        "operator": "is",
                        "filters": []
                    },
                    {
                        "type": "userState",
                        "isEvent": false,
                        "value": ["Maharashtra"],
                        "operator": "is",
                        "filters": []
                    },
                    {
                        "type": "userId",
                        "isEvent": false,
                        "value": ["test@test.com"],
                        "operator": "is",
                        "filters": []
                    },
                    {
                        "type": "userAnonymousId",
                        "isEvent": false,
                        "value": ["asd"],
                        "operator": "is",
                        "filters": []
                    },
                    {
                        "type": "userOs",
                        "isEvent": false,
                        "value": ["Mac OS X"],
                        "operator": "is",
                        "filters": []
                    },
                    {
                        "type": "userBrowser",
                        "isEvent": false,
                        "value": ["Chrome"],
                        "operator": "is",
                        "filters": []
                    },
                    {
                        "type": "userDevice",
                        "isEvent": false,
                        "value": ["iPhone"],
                        "operator": "is",
                        "filters": []
                    },
                    {
                        "type": "platform",
                        "isEvent": false,
                        "value": ["desktop"],
                        "operator": "is",
                        "filters": []
                    },
                    {
                        "type": "revId",
                        "isEvent": false,
                        "value": ["v1"],
                        "operator": "is",
                        "filters": []
                    },
                    {
                        "type": "referrer",
                        "isEvent": false,
                        "value": ["https://www.google.com/"],
                        "operator": "is",
                        "filters": []
                    },
                    {
                        "type": "duration",
                        "isEvent": false,
                        "value": ["60000", "6000000"],
                        "operator": "is",
                        "filters": []
                    },
                    {
                        "type": "tag",
                        "isEvent": true,
                        "value": ["8"],
                        "operator": "is",
                        "filters": []
                    },
                    {
                        "type": "utmSource",
                        "isEvent": false,
                        "value": ["aaa"],
                        "operator": "is",
                        "filters": []
                    },
                    {
                        "type": "utmMedium",
                        "isEvent": false,
                        "value": ["aa"],
                        "operator": "is",
                        "filters": []
                    },
                    {
                        "type": "utmCampaign",
                        "isEvent": false,
                        "value": ["aaa"],
                        "operator": "is",
                        "filters": []
                    },
                    {
                        "type": "metadata",
                        "isEvent": false,
                        "value": ["bbbb"],
                        "operator": "is",
                        "source": "userId",
                        "filters": []
                    },
                    {
                        "type": "custom",
                        "isEvent": true,
                        "value": ["test"],
                        "operator": "is",
                        "filters": []
                    },
                    {
                        "type": "fetch",
                        "isEvent": true,
                        "value": [],
                        "operator": "is",
                        "filters": [
                            {
                                "type": "fetchUrl",
                                "isEvent": false,
                                "value": ["/ai/docs/chat"],
                                "operator": "is",
                                "filters": []
                            },
                            {
                                "type": "fetchStatusCode",
                                "isEvent": false,
                                "value": ["400"],
                                "operator": "=",
                                "filters": []
                            },
                            {
                                "type": "fetchMethod",
                                "isEvent": false,
                                "value": [],
                                "operator": "is",
                                "filters": []
                            },
                            {
                                "type": "fetchDuration",
                                "isEvent": false,
                                "value": [],
                                "operator": "=",
                                "filters": []
                            },
                            {
                                "type": "fetchRequestBody",
                                "isEvent": false,
                                "value": [],
                                "operator": "is",
                                "filters": []
                            },
                            {
                                "type": "fetchResponseBody",
                                "isEvent": false,
                                "value": [],
                                "operator": "is",
                                "filters": []
                            }
                        ]
                    }
                ],
                "eventsOrder": "then"
            }
        }
    ]
}
`
