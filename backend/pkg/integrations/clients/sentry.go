package clients

import (
	"encoding/json"
	"fmt"
	"io"
	"io/ioutil"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"openreplay/backend/pkg/messages"
)

/*
	They also have different stuff
	Documentation says:
		"Note: This endpoint is experimental and may be removed without notice."
*/

type sentry struct {
	OrganizationSlug string // `json:"organization_slug"`
	ProjectSlug      string // `json:"project_slug"`
	Token            string // `json:"token"`
}

type sentryEvent struct {
	Tags []struct {
		Key   string
		Value string `json:"value"`
	}
	DateCreated string `json:"dateCreated"` // or dateReceived ?
	Title       string
	EventID     string `json:"eventID"`
}

func (sn *sentry) Request(c *client) error {
	requestURL := fmt.Sprintf("https://sentry.io/api/0/projects/%v/%v/events/", sn.OrganizationSlug, sn.ProjectSlug)
	req, err := http.NewRequest("GET", requestURL, nil)
	if err != nil {
		return err
	}
	authHeader := "Bearer " + sn.Token
	req.Header.Add("Authorization", authHeader)

	// by link ?
	lastEventId := c.requestData.GetLastMessageId()
	firstEvent := true

PageLoop:
	for {
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			return err
		}
		defer resp.Body.Close()

		if resp.StatusCode >= 400 {
			io.Copy(ioutil.Discard, resp.Body) // Read the body to free socket
			return fmt.Errorf("Sentry: server respond with the code %v", resp.StatusCode)
		}

		var jsonEventList []json.RawMessage
		err = json.NewDecoder(resp.Body).Decode(&jsonEventList)
		if err != nil {
			return err
		}

		for _, jsonEvent := range jsonEventList {
			var e sentryEvent
			err = json.Unmarshal(jsonEvent, &e)
			if err != nil {
				c.errChan <- err
				continue
			}

			if lastEventId == e.EventID {
				break PageLoop
			}

			parsedTime, err := time.Parse(time.RFC3339, e.DateCreated)
			if err != nil {
				c.errChan <- fmt.Errorf("%v | Event: %v", err, e)
				continue
			}
			timestamp := uint64(parsedTime.UnixMilli())
			// TODO: not to receive all the messages (use default integration timestamp)
			if firstEvent { // TODO: reverse range?
				c.requestData.SetLastMessageId(timestamp, e.EventID)
				firstEvent = false
			}

			var sessionID uint64
			var token string
			for _, tag := range e.Tags {
				if tag.Key == "openReplaySessionToken" {
					token = tag.Value
					break
				}
				if tag.Key == "asayer_session_id" {
					sessionID, err = strconv.ParseUint(tag.Value, 10, 64)
					break
				}
			}
			if err != nil {
				c.errChan <- err
				continue
			}
			if token == "" && sessionID == 0 { // We can't felter them on request
				continue
			}

			c.evChan <- &SessionErrorEvent{
				SessionID: sessionID,
				Token:     token,
				IntegrationEvent: &messages.IntegrationEvent{
					Source:    "sentry",
					Timestamp: timestamp,
					Name:      e.Title,
					Payload:   string(jsonEvent),
				},
			}
		}

		// check link before parsing body?
		linkHeader := resp.Header.Get("Link")
		if linkHeader == "" {
			return fmt.Errorf("No Link header found in the responce.")
		}
		pagInfo := strings.Split(linkHeader, ",")
		if len(pagInfo) < 2 {
			return fmt.Errorf("Link header format error. Got: '%v'", linkHeader)
		}

		nextLinkInfo := pagInfo[1]
		if strings.Contains(nextLinkInfo, `results="false"`) {
			break
		}
		if !strings.Contains(nextLinkInfo, `results="true"`) {
			return fmt.Errorf("Link header format error. Results status not found. Got: '%v'", linkHeader)
		}
		nextLink := GetLinkFromAngularBrackets(nextLinkInfo)
		req.URL, err = url.Parse(nextLink)
		if err != nil {
			return err
		}
	}
	return nil
}
