package clients

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"io/ioutil"
	"net/http"
	"time"

	"openreplay/backend/pkg/messages"
)

/*
	We collect Logs. Datadog also has Events

*/

type datadog struct {
	ApplicationKey string //`json:"application_key"`
	ApiKey         string //`json:"api_key"`
}

type datadogResponce struct {
	Logs      []json.RawMessage
	NextLogId *string
	Status    string
}

type datadogLog struct {
	Content struct {
		Timestamp  string
		Message    string
		Attributes struct {
			Error struct { // Not sure about this
				Message string
			}
		}
	}
}

func (d *datadog) makeRequest(nextLogId *string, fromTs uint64, toTs uint64) (*http.Request, error) {
	requestURL := fmt.Sprintf(
		"https://api.datadoghq.com/api/v1/logs-queries/list?api_key=%v&application_key=%v",
		d.ApiKey,
		d.ApplicationKey,
	)
	startAt := "null"
	if nextLogId != nil && *nextLogId != "" {
		startAt = *nextLogId
	}
	// Query: status:error/info/warning?
	// openReplaySessionToken instead of asayer_session_id
	jsonBody := fmt.Sprintf(`{
    "limit": 1000,
    "query": "status:error openReplaySessionToken",
    "sort": "asc",
    "time": {
        "from": %v,
        "to": %v
    },
    "startAt": %v
  }`, fromTs, toTs, startAt) // from/to:  both inclusively, both required;  limit: default=10, max 1000
	req, err := http.NewRequest("POST", requestURL, bytes.NewBuffer([]byte(jsonBody)))
	if err != nil {
		return nil, err
	}
	req.Header.Add("Content-Type", "application/json")
	return req, nil
}

func (d *datadog) Request(c *client) error {
	fromTs := c.requestData.GetLastMessageTimestamp() + 1 // From next millisecond
	toTs := uint64(time.Now().UnixMilli())
	var nextLogId *string
	for {
		req, err := d.makeRequest(nextLogId, fromTs, toTs)
		if err != nil {
			return err
		}
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			return err
		}
		defer resp.Body.Close()
		if resp.StatusCode >= 400 {
			io.Copy(ioutil.Discard, resp.Body) // Read the body to free socket
			return fmt.Errorf("Datadog: server respond with the code %v", resp.StatusCode)
		}
		var ddResp datadogResponce
		if err = json.NewDecoder(resp.Body).Decode(&ddResp); err != nil {
			return err
		}
		// if ddResp.Status != "done"/ "ok"
		for _, jsonLog := range ddResp.Logs {
			var ddLog datadogLog
			err = json.Unmarshal(jsonLog, &ddLog)
			if err != nil {
				c.errChan <- err
				continue
			}
			token, err := GetToken(ddLog.Content.Message) // sure here?
			if err != nil {
				c.errChan <- err
				continue
			}
			parsedTime, err := time.Parse(time.RFC3339, ddLog.Content.Timestamp)
			if err != nil {
				c.errChan <- err
				continue
			}
			timestamp := uint64(parsedTime.UnixMilli())
			c.requestData.SetLastMessageTimestamp(timestamp)
			c.evChan <- &SessionErrorEvent{
				//SessionID: sessionID,
				Token: token,
				IntegrationEvent: &messages.IntegrationEvent{
					Source:    "datadog",
					Timestamp: timestamp,
					Name:      ddLog.Content.Attributes.Error.Message,
					Payload:   string(jsonLog),
				},
			}
		}
		nextLogId = ddResp.NextLogId // ensure
		if nextLogId == nil {
			return nil
		}
	}
}
