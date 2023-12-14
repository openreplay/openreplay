package integrations

import (
	"log"
	"openreplay/backend/pkg/integrations/clients"
	"openreplay/backend/pkg/integrations/model"
)

type Manager struct {
	clientMap          clients.ClientMap
	Events             chan *clients.SessionErrorEvent
	Errors             chan error
	RequestDataUpdates chan model.Integration // not pointer because it could change in other thread
}

func NewManager() *Manager {
	return &Manager{
		clientMap:          make(clients.ClientMap),
		RequestDataUpdates: make(chan model.Integration, 100),
		Events:             make(chan *clients.SessionErrorEvent, 100),
		Errors:             make(chan error, 100),
	}
}

func (m *Manager) Update(i *model.Integration) (err error) {
	log.Printf("Integration initialization: %v\n", *i)
	key := i.GetKey()
	if i.Options == nil {
		delete(m.clientMap, key)
		return nil
	}
	c, exists := m.clientMap[key]
	if !exists {
		c, err = clients.NewClient(i, m.RequestDataUpdates, m.Events, m.Errors)
		if err != nil {
			return err
		}
		m.clientMap[key] = c
	}
	return c.Update(i)
}

func (m *Manager) RequestAll() {
	log.Printf("Requesting all...\n")
	for _, c := range m.clientMap {
		go c.Request()
	}
}
