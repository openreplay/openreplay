package clients

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/ioutil"
	"net/http"
	"strconv"
	"strings"
	"time"

	"openreplay/backend/pkg/messages"
)

// Old name: asayerSessionId

// QUERY: what can be modified?
const RB_QUERY = "SELECT item.id, item.title,body.message.openReplaySessionToken,item.level," +
	" item.counter,item.environment,body.crash_report.raw,body.message.body,timestamp" +
	" FROM item_occurrence" +
	" WHERE body.message.openReplaySessionToken != null" +
	" AND timestamp>= %v" +
	" AND item.level>30" +
	" ORDER BY timestamp" +
	" LIMIT 1000"

// ASC by default
// \n\t symbols can spoil the request body, so it wouldn't work (OR probably it happend because of job hashing)

/*
	- `read` Access Token required
	- timstamp in seconds
*/

type rollbar struct {
	AccessToken string // `json:"access_token"`
}

type rollbarJobResponce struct {
	Err     int
	Message string
	Result  struct {
		Id int
	}
}

type rollbarJobStatusResponce struct {
	Err    int
	Result struct {
		Status string
		Result struct {
			Rows    [][]json.Number
			Columns []string
		}
	}
}

type rollbarEvent map[string]string

/*
	  It is possible to use /api/1/instances (20 per page)
		Jobs for the identical requests are hashed
*/
func (rb *rollbar) Request(c *client) error {
	fromTs := c.requestData.GetLastMessageTimestamp() + 1000 // From next second
	c.requestData.SetLastMessageTimestamp(fromTs)            // anti-job-hashing
	fromTsSec := fromTs / 1e3
	query := fmt.Sprintf(RB_QUERY, fromTsSec)
	jsonBody := fmt.Sprintf(`{
		"access_token": "%v",
		"query_string": "%v"
	}`, rb.AccessToken, query)
	req, err := http.NewRequest("POST", "https://api.rollbar.com/api/1/rql/jobs", strings.NewReader(jsonBody))
	if err != nil {
		return err
	}
	req.Header.Add("Content-Type", "application/json")
	req.Header.Add("Accept", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	// status != 200 || 201
	// status can be 403 then should report about wrong token
	if resp.StatusCode >= 400 {
		io.Copy(ioutil.Discard, resp.Body) // Read the body to free socket
		return fmt.Errorf("Rollbar: server respond with the code %v", resp.StatusCode)
	}

	var jobResponce rollbarJobResponce
	if err = json.NewDecoder(resp.Body).Decode(&jobResponce); err != nil {
		return err
	}
	if jobResponce.Err != 0 {
		return fmt.Errorf("Rollbar job responce error: %v", jobResponce.Message)
	}

	requestURL := fmt.Sprintf(
		"https://api.rollbar.com/api/1/rql/job/%v?access_token=%v&expand=result",
		jobResponce.Result.Id,
		rb.AccessToken,
	)
	req, err = http.NewRequest("GET", requestURL, nil)
	if err != nil {
		return err
	}

	tick := time.Tick(5 * time.Second)
	for {
		<-tick
		resp, err = http.DefaultClient.Do(req)
		if err != nil {
			return err // continue + timeout/maxAttempts
		}
		defer resp.Body.Close()
		// status != 200
		var jobStatus rollbarJobStatusResponce
		err := json.NewDecoder(resp.Body).Decode(&jobStatus)
		if err != nil {
			return err
		}

		//todo: pagintation; limit: 1000

		if jobStatus.Result.Status == "success" {
			for _, row := range jobStatus.Result.Result.Rows {
				e := make(rollbarEvent)
				for i, col := range jobStatus.Result.Result.Columns {
					//if len(row) <= i { error }
					e[col] = row[i].String() // here I make them all string. That's not good
				}
				// sessionID, err := strconv.ParseUint(e[ "body.message.asayerSessionId" ], 10, 64)
				// if err != nil {
				// 	c.errChan <- err
				// 	continue
				// }
				if e["body.message.openReplaySessionToken"] == "" {
					c.errChan <- errors.New("Token is empty!")
					continue
				}
				payload, err := json.Marshal(e)
				if err != nil {
					c.errChan <- err
					continue
				}
				timestampSec, err := strconv.ParseUint(e["timestamp"], 10, 64)
				if err != nil {
					c.errChan <- err
					continue
				}
				timestamp := timestampSec * 1000
				c.requestData.SetLastMessageTimestamp(timestamp)
				c.evChan <- &SessionErrorEvent{
					Token: e["body.message.openReplaySessionToken"],
					IntegrationEvent: &messages.IntegrationEvent{
						Source:    "rollbar",
						Timestamp: timestamp,
						Name:      e["item.title"],
						Payload:   string(payload),
					},
				}
			}
			break
		}
		if jobStatus.Result.Status != "new" &&
			jobStatus.Result.Status != "running" {
			// error
			break
		}
	}
	return nil
}
