package clientManager

import (
	"openreplay/backend/internal/integrations/integration"
	"openreplay/backend/pkg/integrations"
	"strconv"
)

type manager struct {
	clientMap          integration.ClientMap
	Events             chan *integration.SessionErrorEvent
	Errors             chan error
	RequestDataUpdates chan integrations.Integration // not pointer because it could change in other thread
}

func NewManager() *manager {
	return &manager{
		clientMap:          make(integration.ClientMap),
		RequestDataUpdates: make(chan integrations.Integration, 100),
		Events:             make(chan *integration.SessionErrorEvent, 100),
		Errors:             make(chan error, 100),
	}

}

func (m *manager) Update(i *integrations.Integration) error {
	key := strconv.Itoa(int(i.ProjectID)) + i.Provider
	if i.Options == nil {
		delete(m.clientMap, key)
		return nil
	}
	c, exists := m.clientMap[key]
	if !exists {
		c, err := integration.NewClient(i, m.RequestDataUpdates, m.Events, m.Errors)
		if err != nil {
			return err
		}
		m.clientMap[key] = c
		return nil
	}
	return c.Update(i)
}

func (m *manager) RequestAll() {
	for _, c := range m.clientMap {
		go c.Request()
	}
}
