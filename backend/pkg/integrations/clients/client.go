package clients

import (
	"encoding/json"
	"fmt"
	"openreplay/backend/pkg/integrations/model"
	"openreplay/backend/pkg/messages"
	"sync"
)

type requester interface {
	Request(*client) error
}

type client struct {
	requester
	requestData *model.RequestInfo
	integration *model.Integration
	mux         sync.Mutex
	updateChan  chan<- model.Integration
	evChan      chan<- *SessionErrorEvent
	errChan     chan<- error
}

type SessionErrorEvent struct {
	SessionID uint64
	Token     string
	*messages.IntegrationEvent
}

type ClientMap map[string]*client

func NewClient(i *model.Integration, updateChan chan<- model.Integration, evChan chan<- *SessionErrorEvent, errChan chan<- error) (*client, error) {
	ri, err := i.GetRequestInfo()
	if err != nil {
		return nil, err
	}
	c := &client{
		evChan:      evChan,
		errChan:     errChan,
		updateChan:  updateChan,
		requestData: ri,
	}
	return c, nil
}

func (c *client) Update(i *model.Integration) error {
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

	c.mux.Lock()
	defer c.mux.Unlock()

	c.integration = i
	c.requester = r
	return nil
}

func (c *client) handleError(err error) {
	c.errChan <- fmt.Errorf("%v | Integration: %v", err, *c.integration)
}

func (c *client) Request() {
	c.mux.Lock()
	defer c.mux.Unlock()

	if !c.requestData.CanAttempt() {
		return
	}
	c.requestData.UpdateLastAttempt()

	err := c.requester.Request(c)
	if err != nil {
		c.requestData.Inc()
		c.handleError(fmt.Errorf("ERRROR L139, err: %s", err))
	} else {
		c.requestData.Reset()
	}

	rd, err := c.requestData.Encode()
	if err != nil {
		c.handleError(err)
	}
	// RequestData is a byte array (pointer-like type), but it's replacement
	// won't affect the previous value sent by channel
	c.integration.RequestData = rd
	c.updateChan <- *c.integration
}
