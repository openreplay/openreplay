package clients

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/ioutil"
	"net/http"
	"time"

	"openreplay/backend/pkg/messages"
)

/*
	We use insights-api for query. They also have Logs and Events
*/

// TODO: Eu/us
type newrelic struct {
	ApplicationId string //`json:"application_id"`
	XQueryKey     string //`json:"x_query_key"`
}

// TODO: Recheck
type newrelicResponce struct {
	Results []struct {
		Events []json.RawMessage
	}
}

type newrelicEvent struct {
	OpenReplaySessionToken string `json:"openReplaySessionToken"`
	ErrorClass             string `json:"error.class"`
	Timestamp              uint64 `json:"timestamp"`
}

func (nr *newrelic) Request(c *client) error {
	sinceTs := c.requestData.GetLastMessageTimestamp() + 1000 // From next second
	// In docs - format "yyyy-mm-dd HH:MM:ss", but time.RFC3339 works fine too
	sinceFormatted := time.UnixMilli(int64(sinceTs)).Format(time.RFC3339)
	// US/EU endpoint ??
	requestURL := fmt.Sprintf("https://insights-api.eu.newrelic.com/v1/accounts/%v/query", nr.ApplicationId)
	req, err := http.NewRequest("GET", requestURL, nil)
	if err != nil {
		return err
	}

	// The docks and api are awfull. Seems like SINCE works inclusively.
	nrql := fmt.Sprintf("SELECT * FROM TransactionError SINCE '%v' WHERE openReplaySessionToken IS NOT NULL", sinceFormatted)
	q := req.URL.Query()
	q.Add("nrql", nrql)
	req.URL.RawQuery = q.Encode()

	req.Header.Add("X-Query-Key", nr.XQueryKey)
	req.Header.Add("Accept", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	//  401 (unauthorised) if wrong XQueryKey/deploymentServer is wrong or 403 (Forbidden) if ApplicationId is wrong
	// 400 if Query has problems
	if resp.StatusCode >= 400 {
		io.Copy(ioutil.Discard, resp.Body) // Read the body to free socket
		return fmt.Errorf("Newrelic: server respond with the code %v| Request: ", resp.StatusCode, *req)
	}
	// Pagination depending on returning metadata ?
	var nrResp newrelicResponce
	if err = json.NewDecoder(resp.Body).Decode(&nrResp); err != nil {
		return err
	}
	for _, r := range nrResp.Results {
		for _, jsonEvent := range r.Events {
			var e newrelicEvent
			if err = json.Unmarshal(jsonEvent, &e); err != nil {
				c.errChan <- err
				continue
			}
			if e.OpenReplaySessionToken == "" {
				c.errChan <- errors.New("Token is empty")
				continue
			}

			c.requestData.SetLastMessageTimestamp(e.Timestamp)
			c.evChan <- &SessionErrorEvent{
				Token: e.OpenReplaySessionToken,
				IntegrationEvent: &messages.IntegrationEvent{
					Source:    "newrelic",
					Timestamp: e.Timestamp,
					Name:      e.ErrorClass,
					Payload:   string(jsonEvent),
				},
			}
		}
	}
	return nil
}
