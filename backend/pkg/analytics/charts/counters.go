package charts

import (
	"context"
	"fmt"
	"log"
	"strconv"
	"strings"
)

type Fields map[string]string

func getSessionMetaFields() Fields {
	return Fields{
		"revId":    "rev_id",
		"country":  "user_country",
		"os":       "user_os",
		"platform": "user_device_type",
		"device":   "user_device",
		"browser":  "user_browser",
	}
}

func getMetadataFields() Fields {
	return Fields{
		"userId":          "user_id",
		"userAnonymousId": "user_anonymous_id",
		"metadata1":       "metadata_1",
		"metadata2":       "metadata_2",
		"metadata3":       "metadata_3",
		"metadata4":       "metadata_4",
		"metadata5":       "metadata_5",
		"metadata6":       "metadata_6",
		"metadata7":       "metadata_7",
		"metadata8":       "metadata_8",
		"metadata9":       "metadata_9",
		"metadata10":      "metadata_10",
	}
}

func getStepSize(startTimestamp, endTimestamp int64, density int, decimal bool, factor int) float64 {
	factorInt64 := int64(factor)
	stepSize := (endTimestamp / factorInt64) - (startTimestamp / factorInt64)

	if density <= 1 {
		return float64(stepSize)
	}

	if decimal {
		return float64(stepSize) / float64(density)
	}

	return float64(stepSize / int64(density-1))
}

//func getStepSize(startTimestamp, endTimestamp, density uint64, decimal bool, factor uint64) float64 {
//	stepSize := (endTimestamp / factor) - (startTimestamp / factor) // TODO: should I use float64 here?
//	if !decimal {
//		density--
//	}
//	return float64(stepSize) / float64(density)
//}

func getBasicConstraints(tableName string, timeConstraint, roundStart bool, data map[string]interface{}, identifier string) []string { // Если tableName не пустая, добавляем точку
	if tableName != "" {
		tableName += "."
	}
	chSubQuery := []string{fmt.Sprintf("%s%s = toUInt16(:%s)", tableName, identifier, identifier)}

	if timeConstraint {
		if roundStart {
			chSubQuery = append(chSubQuery, fmt.Sprintf("toStartOfInterval(%sdatetime, INTERVAL :step_size second) >= toDateTime(:startTimestamp/1000)", tableName))
		} else {
			chSubQuery = append(chSubQuery, fmt.Sprintf("%sdatetime >= toDateTime(:startTimestamp/1000)", tableName))
		}
		chSubQuery = append(chSubQuery, fmt.Sprintf("%sdatetime < toDateTime(:endTimestamp/1000)", tableName))
	}
	return append(chSubQuery, getGenericConstraint(data, tableName)...)
}

func getGenericConstraint(data map[string]interface{}, tableName string) []string {
	return getConstraint(data, getSessionMetaFields(), tableName)
}

func getConstraint(data map[string]interface{}, fields Fields, tableName string) []string {
	var constraints []string
	filters, err := data["filters"].([]map[string]interface{})
	if !err {
		log.Println("error getting filters from data")
		filters = make([]map[string]interface{}, 0) // to skip the next block
	}

	// process filters
	for i, f := range filters {
		key, _ := f["key"].(string)
		value, _ := f["value"].(string)

		if field, ok := fields[key]; ok {
			if value == "*" || value == "" {
				constraints = append(constraints, fmt.Sprintf("isNotNull(%s%s)", tableName, field))
			} else {
				// constraints.append(f"{table_name}{fields[f['key']]} = %({f['key']}_{i})s")
				constraints = append(constraints, fmt.Sprintf("%s%s = %%(%s_%d)s", tableName, field, key, i)) // TODO: where we'll keep the value?
			}
		}
	}

	// TODO from Python: remove this in next release
	offset := len(filters)
	for i, f := range data {
		key, _ := f.(string)
		value, _ := data[key].(string)

		if field, ok := fields[key]; ok {
			if value == "*" || value == "" {
				constraints = append(constraints, fmt.Sprintf("isNotNull(%s%s)", tableName, field))
			} else {
				intI, err := strconv.Atoi(i)
				if err != nil {
					log.Printf("error converting data[k] to int: %v", err)
					continue
				} else {
					constraints = append(constraints, fmt.Sprintf("%s%s = %%(%s_%d)s", tableName, field, f, intI+offset))
				}
			}
		}
	}
	return constraints
}

func getMetaConstraint(data map[string]interface{}) []string {
	return getConstraint(data, getMetadataFields(), "sessions_metadata.")
}

func getConstraintValues(data map[string]interface{}) map[string]interface{} {
	params := make(map[string]interface{})

	if filters, ok := data["filters"].([]map[string]interface{}); ok {
		for i, f := range filters {
			key, _ := f["key"].(string)
			value := f["value"]
			params[fmt.Sprintf("%s_%d", key, i)] = value
		}

		// TODO from Python: remove this in next release
		offset := len(data["filters"].([]map[string]interface{}))
		i := 0
		for k, v := range data {
			params[fmt.Sprintf("%s_%d", k, i+offset)] = v
			i++
		}
	}

	return params
}

/*
def get_main_sessions_table(timestamp=0):

	return "experimental.sessions_l7d_mv" \
	    if config("EXP_7D_MV", cast=bool, default=True) \
	       and timestamp and timestamp >= TimeUTC.now(delta_days=-7) else "experimental.sessions"
*/
func getMainSessionsTable(timestamp int64) string {
	return "product_analytics.sessions"
}

// Function to convert named parameters to positional parameters
func replaceNamedParams(query string, params map[string]interface{}) (string, []interface{}) {
	var args []interface{}
	i := 1
	for key, val := range params {
		placeholder := ":" + key
		//query = strings.Replace(query, placeholder, "?", 1)
		strVal := fmt.Sprintf("%v", val)
		query = strings.Replace(query, placeholder, strVal, -1)
		args = append(args, val)
		i++
	}
	return query, args
}

// Helper function to generate a range of floats
func frange(start, end, step float64) []float64 {
	var rangeValues []float64
	for i := start; i < end; i += step {
		rangeValues = append(rangeValues, i)
	}
	return rangeValues
}

// Helper function to add missing keys from the "complete" map to the "original" map
func addMissingKeys(original, complete map[string]interface{}) map[string]interface{} {
	for k, v := range complete {
		if _, exists := original[k]; !exists {
			original[k] = v
		}
	}
	return original
}

// CompleteMissingSteps fills in missing steps in the data
func CompleteMissingSteps(
	startTime, endTime int64,
	density int,
	neutral map[string]interface{},
	rows []map[string]interface{},
	timeKey string,
	timeCoefficient int64,
) []map[string]interface{} {
	if len(rows) == density {
		return rows
	}

	// Calculate the step size
	step := getStepSize(startTime, endTime, density, true, 1000)
	optimal := make([][2]uint64, 0)
	for _, i := range frange(float64(startTime)/float64(timeCoefficient), float64(endTime)/float64(timeCoefficient), step) {
		startInterval := uint64(i * float64(timeCoefficient))
		endInterval := uint64((i + step) * float64(timeCoefficient))
		optimal = append(optimal, [2]uint64{startInterval, endInterval})
	}

	var result []map[string]interface{}
	r, o := 0, 0

	// Iterate over density
	for i := 0; i < density; i++ {
		// Clone the neutral map
		neutralClone := make(map[string]interface{})
		for k, v := range neutral {
			if fn, ok := v.(func() interface{}); ok {
				neutralClone[k] = fn()
			} else {
				neutralClone[k] = v
			}
		}

		// If we can just add the rest of the rows to result
		if r < len(rows) && len(result)+len(rows)-r == density {
			result = append(result, rows[r:]...)
			break
		}

		// Determine where the current row fits within the optimal intervals
		if r < len(rows) && o < len(optimal) && rows[r][timeKey].(uint64) < optimal[o][0] {
			rows[r] = addMissingKeys(rows[r], neutralClone)
			result = append(result, rows[r])
			r++
		} else if r < len(rows) && o < len(optimal) && optimal[o][0] <= rows[r][timeKey].(uint64) && rows[r][timeKey].(uint64) < optimal[o][1] {
			rows[r] = addMissingKeys(rows[r], neutralClone)
			result = append(result, rows[r])
			r++
			o++
		} else {
			neutralClone[timeKey] = optimal[o][0]
			result = append(result, neutralClone)
			o++
		}
	}
	return result
}

func progress(oldVal, newVal uint64) float64 {
	if newVal > 0 {
		return (float64(oldVal-newVal) / float64(newVal)) * 100
	}
	if oldVal == 0 {
		return 0
	}
	return 100
}

// Trying to find a common part
func parse(projectID uint64, startTs, endTs int64, density int, args map[string]interface{}) ([]string, []string, map[string]interface{}) {
	stepSize := getStepSize(startTs, endTs, density, false, 1000)
	chSubQuery := getBasicConstraints("sessions", true, false, args, "project_id")
	chSubQueryChart := getBasicConstraints("sessions", true, true, args, "project_id")
	metaCondition := getMetaConstraint(args)
	chSubQuery = append(chSubQuery, metaCondition...)
	chSubQueryChart = append(chSubQueryChart, metaCondition...)

	params := map[string]interface{}{
		"step_size":      stepSize,
		"project_id":     projectID,
		"startTimestamp": startTs,
		"endTimestamp":   endTs,
	}
	for k, v := range getConstraintValues(args) {
		params[k] = v
	}
	return chSubQuery, chSubQueryChart, params
}

// Sessions trend
func (s *chartsImpl) getProcessedSessions(projectID uint64, startTs, endTs int64, density int, args map[string]interface{}) {
	chQuery := `
		SELECT toUnixTimestamp(toStartOfInterval(sessions.datetime, INTERVAL :step_size second)) * 1000 AS timestamp,
		COUNT(DISTINCT sessions.session_id) AS value
    	FROM :main_sessions_table AS sessions
    	WHERE :sub_query_chart
    	GROUP BY timestamp
    	ORDER BY timestamp;
	`
	chSubQuery, chSubQueryChart, params := parse(projectID, startTs, endTs, density, args)

	chQuery = strings.Replace(chQuery, ":main_sessions_table", getMainSessionsTable(startTs), -1)
	chQuery = strings.Replace(chQuery, ":sub_query_chart", strings.Join(chSubQueryChart, " AND "), -1)

	preparedQuery, preparedArgs := replaceNamedParams(chQuery, params)
	rows, err := s.chConn.Query(context.Background(), preparedQuery, preparedArgs)
	if err != nil {
		log.Fatalf("Error executing query: %v", err)
	}
	preparedRows := make([]map[string]interface{}, 0)
	var sum uint64
	for rows.Next() {
		var timestamp, value uint64
		if err := rows.Scan(&timestamp, &value); err != nil {
			log.Fatalf("Error scanning row: %v", err)
		}
		fmt.Printf("Timestamp: %d, Value: %d\n", timestamp, value)
		sum += value
		preparedRows = append(preparedRows, map[string]interface{}{"timestamp": timestamp, "value": value})
	}

	results := map[string]interface{}{
		"value": sum,
		"chart": CompleteMissingSteps(startTs, endTs, int(density), map[string]interface{}{"value": 0}, preparedRows, "timestamp", 1000),
	}

	diff := endTs - startTs
	endTs = startTs
	startTs = endTs - diff

	log.Println(results)

	chQuery = fmt.Sprintf(`
		SELECT COUNT(1) AS count
		FROM :main_sessions_table AS sessions
		WHERE :sub_query_chart;
	`)
	chQuery = strings.Replace(chQuery, ":main_sessions_table", getMainSessionsTable(startTs), -1)
	chQuery = strings.Replace(chQuery, ":sub_query_chart", strings.Join(chSubQuery, " AND "), -1)

	var count uint64

	preparedQuery, preparedArgs = replaceNamedParams(chQuery, params)
	if err := s.chConn.QueryRow(context.Background(), preparedQuery, preparedArgs).Scan(&count); err != nil {
		log.Fatalf("Error executing query: %v", err)
	}

	results["progress"] = progress(count, results["value"].(uint64))

	// TODO: this should be returned in any case
	results["unit"] = "COUNT"
	fmt.Println(results)
}

// Users trend
func (c *chartsImpl) getUniqueUsers(projectID uint64, startTs, endTs uint64, density uint64, args map[string]interface{}) {
	chQuery := `
		SELECT toUnixTimestamp(toStartOfInterval(sessions.datetime, INTERVAL :step_size second)) * 1000 AS timestamp,
		COUNT(DISTINCT sessions.user_id) AS value
  	FROM :main_sessions_table AS sessions
  	WHERE :sub_query_chart
  	GROUP BY timestamp
  	ORDER BY timestamp;
	`
	chSubQuery, chSubQueryChart, params := parse(projectID, startTs, endTs, density, args)
	chSubQueryChart = append(chSubQueryChart, []string{"isNotNull(sessions.user_id)", "sessions.user_id!=''"}...)

	chQuery = strings.Replace(chQuery, ":main_sessions_table", getMainSessionsTable(startTs), -1)
	chQuery = strings.Replace(chQuery, ":sub_query_chart", strings.Join(chSubQueryChart, " AND "), -1)

	preparedQuery, preparedArgs := replaceNamedParams(chQuery, params)
	rows, err := c.chConn.Query(context.Background(), preparedQuery, preparedArgs)
	if err != nil {
		log.Fatalf("Error executing query: %v", err)
	}
	preparedRows := make([]map[string]interface{}, 0)
	var sum uint64
	for rows.Next() {
		var timestamp, value uint64
		if err := rows.Scan(&timestamp, &value); err != nil {
			log.Fatalf("Error scanning row: %v", err)
		}
		fmt.Printf("Timestamp: %d, Value: %d\n", timestamp, value)
		sum += value
		preparedRows = append(preparedRows, map[string]interface{}{"timestamp": timestamp, "value": value})
	}

	results := map[string]interface{}{
		"value": sum,
		"chart": CompleteMissingSteps(startTs, endTs, int(density), map[string]interface{}{"value": 0}, preparedRows, "timestamp", 1000),
	}

	diff := endTs - startTs
	endTs = startTs
	startTs = endTs - diff

	log.Println(results)

	chQuery = fmt.Sprintf(`
		SELECT COUNT(DISTINCT user_id) AS count
		FROM :main_sessions_table AS sessions
		WHERE :sub_query_chart;
	`)
	chQuery = strings.Replace(chQuery, ":main_sessions_table", getMainSessionsTable(startTs), -1)
	chQuery = strings.Replace(chQuery, ":sub_query_chart", strings.Join(chSubQuery, " AND "), -1)

	var count uint64

	preparedQuery, preparedArgs = replaceNamedParams(chQuery, params)
	if err := c.chConn.QueryRow(context.Background(), preparedQuery, preparedArgs).Scan(&count); err != nil {
		log.Fatalf("Error executing query: %v", err)
	}

	results["progress"] = progress(count, results["value"].(uint64))

	// TODO: this should be returned in any case
	results["unit"] = "COUNT"
	fmt.Println(results)

	return
}
