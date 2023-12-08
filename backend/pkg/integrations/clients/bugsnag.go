package clients

import (
	"encoding/json"
	"fmt"
	"io"
	"io/ioutil"
	"net/http"
	"net/url"
	"time"

	"openreplay/backend/pkg/messages"
)

/*
	- Bugsnag messages usually recived later then others
*/

type bugsnag struct {
	BugsnagProjectId   string // `json:"bugsnag_project_id"`
	AuthorizationToken string // `json:"auth_token"`
}

type bugsnagEvent struct {
	MetaData struct {
		SpecialInfo struct {
			AsayerSessionId        uint64 `json:"asayerSessionId,string"`
			OpenReplaySessionToken string `json:"openReplaySessionToken"`
		} `json:"special_info"`
	} `json:"metaData"`
	ReceivedAt string `json:"received_at"` // can use time.Time as it implements UnmarshalJSON from RFC3339 format
	Exceptions [1]struct {
		Message string
	}
}

// need result chan and lastMessageTs
func (b *bugsnag) Request(c *client) error {
	sinceTs := c.requestData.GetLastMessageTimestamp() + 1000 // From next second
	sinceFormatted := time.UnixMilli(int64(sinceTs)).Format(time.RFC3339)
	requestURL := fmt.Sprintf("https://api.bugsnag.com/projects/%v/events", b.BugsnagProjectId)
	req, err := http.NewRequest("GET", requestURL, nil)
	if err != nil {
		return err
	}
	q := req.URL.Query()
	// q.Add("per_page", "100") // Up to a maximum of 30. Default: 30
	// q.Add("sort", "timestamp") // Default: timestamp (timestamp == ReceivedAt ??)
	q.Add("direction", "asc")     // Default: desc
	q.Add("full_reports", "true") // Default: false
	q.Add("filters[event.since][][type]", "eq")
	q.Add("filters[event.since][][value]", sinceFormatted) // seems like inclusively
	req.URL.RawQuery = q.Encode()

	authToken := "token " + b.AuthorizationToken
	req.Header.Add("Authorization", authToken)
	req.Header.Add("X-Version", "2")

	for {
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			return err
		}
		defer resp.Body.Close()

		// Status code
		//  401 (unauthorised)
		if resp.StatusCode >= 400 {
			io.Copy(ioutil.Discard, resp.Body) // Read the body to free socket
			return fmt.Errorf("Bugsnag: server respond with the code %v | data: %v ", resp.StatusCode, *b)
		}

		var jsonEventList []json.RawMessage
		err = json.NewDecoder(resp.Body).Decode(&jsonEventList)
		if err != nil {
			return err
		}
		for _, jsonEvent := range jsonEventList {
			var e bugsnagEvent
			err = json.Unmarshal(jsonEvent, &e)
			if err != nil {
				c.errChan <- err
				continue
			}
			sessionID := e.MetaData.SpecialInfo.AsayerSessionId
			token := e.MetaData.SpecialInfo.OpenReplaySessionToken
			if sessionID == 0 && token == "" {
				// c.errChan <- "No AsayerSessionId found. | Message: %v", e
				continue
			}
			parsedTime, err := time.Parse(time.RFC3339, e.ReceivedAt)
			if err != nil {
				c.errChan <- err
				continue
			}
			timestamp := uint64(parsedTime.UnixMilli())
			c.requestData.SetLastMessageTimestamp(timestamp)
			c.evChan <- &SessionErrorEvent{
				SessionID: sessionID,
				Token:     token,
				IntegrationEvent: &messages.IntegrationEvent{
					Source:    "bugsnag",
					Timestamp: timestamp,
					Name:      e.Exceptions[0].Message,
					Payload:   string(jsonEvent),
				},
			}
		}

		linkHeader := resp.Header.Get("Link")
		if linkHeader == "" {
			break
		}

		nextLink := GetLinkFromAngularBrackets(linkHeader)
		req.URL, err = url.Parse(nextLink)
		if err != nil {
			return err
		}
	}
	return nil
}
