package integration

import (
	"encoding/json"
	"fmt"
	"log"
	"openreplay/backend/pkg/integrations"
	"sync"
	"time"

	"openreplay/backend/pkg/messages"
)

const MAX_ATTEMPTS_IN_A_ROW = 4
const MAX_ATTEMPTS = 40
const ATTEMPTS_INTERVAL = 3 * 60 * 60 * 1000

type requester interface {
	Request(*client) error
}

type requestData struct {
	LastMessageTimestamp       uint64 // `json:"lastMessageTimestamp, string"`
	LastMessageId              string
	UnsuccessfullAttemptsCount int
	LastAttemptTimestamp       int64
}

type client struct {
	requestData
	requester
	integration *integrations.Integration
	// TODO: timeout ?
	mux        sync.Mutex
	updateChan chan<- integrations.Integration
	evChan     chan<- *SessionErrorEvent
	errChan    chan<- error
}

type SessionErrorEvent struct {
	SessionID uint64
	Token     string
	*messages.IntegrationEvent
}

type ClientMap map[string]*client

func NewClient(i *integrations.Integration, updateChan chan<- integrations.Integration, evChan chan<- *SessionErrorEvent, errChan chan<- error) (*client, error) {
	c := new(client)
	if err := c.Update(i); err != nil {
		return nil, err
	}

	if err := json.Unmarshal(i.RequestData, &c.requestData); err != nil {
		return nil, err
	}
	c.evChan = evChan
	c.errChan = errChan
	c.updateChan = updateChan
	// TODO: RequestData manager
	if c.requestData.LastMessageTimestamp == 0 {
		// ?
		c.requestData.LastMessageTimestamp = uint64(time.Now().Add(-time.Hour * 24).UnixMilli())
	}

	return c, nil
}

// from outside
func (c *client) Update(i *integrations.Integration) error {
	c.mux.Lock()
	defer c.mux.Unlock()
	var r requester
	switch i.Provider {
	case "bugsnag":
		r = new(bugsnag)
	case "cloudwatch":
		r = new(cloudwatch)
	case "datadog":
		r = new(datadog)
	case "elasticsearch":
		r = new(elasticsearch)
	case "newrelic":
		r = new(newrelic)
	case "rollbar":
		r = new(rollbar)
	case "sentry":
		r = new(sentry)
	case "stackdriver":
		r = new(stackdriver)
	case "sumologic":
		r = new(sumologic)
	}
	if err := json.Unmarshal(i.Options, r); err != nil {
		return err
	}
	c.integration = i
	c.requester = r
	return nil
}

// package scope
func (c *client) setLastMessageTimestamp(timestamp uint64) {
	if timestamp > c.requestData.LastMessageTimestamp {
		c.requestData.LastMessageTimestamp = timestamp
	}
}
func (c *client) getLastMessageTimestamp() uint64 {
	return c.requestData.LastMessageTimestamp
}
func (c *client) setLastMessageId(timestamp uint64, id string) {
	//if timestamp >= c.requestData.LastMessageTimestamp {
	c.requestData.LastMessageId = id
	c.requestData.LastMessageTimestamp = timestamp
	//}
}
func (c *client) getLastMessageId() string {
	return c.requestData.LastMessageId
}

func (c *client) handleError(err error) {
	c.errChan <- fmt.Errorf("%v | Integration: %v", err, *c.integration)
}

// Thread-safe
func (c *client) Request() {
	c.mux.Lock()
	defer c.mux.Unlock()
	if c.requestData.UnsuccessfullAttemptsCount >= MAX_ATTEMPTS ||
		(c.requestData.UnsuccessfullAttemptsCount >= MAX_ATTEMPTS_IN_A_ROW &&
			time.Now().UnixMilli()-c.requestData.LastAttemptTimestamp < ATTEMPTS_INTERVAL) {
		return
	}

	c.requestData.LastAttemptTimestamp = time.Now().UnixMilli()
	err := c.requester.Request(c)
	if err != nil {
		log.Println("ERRROR L139")
		log.Println(err)
		c.handleError(err)
		c.requestData.UnsuccessfullAttemptsCount++
	} else {
		c.requestData.UnsuccessfullAttemptsCount = 0
	}
	rd, err := json.Marshal(c.requestData)
	if err != nil {
		c.handleError(err)
	}
	// RequestData is a byte array (pointer-like type), but it's replacement
	// won't affect the previous value sent by channel
	c.integration.RequestData = rd
	c.updateChan <- *c.integration
}
