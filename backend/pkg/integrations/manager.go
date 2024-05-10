package integrations

import (
	"context"
	"openreplay/backend/pkg/integrations/clients"
	"openreplay/backend/pkg/integrations/model"
	"openreplay/backend/pkg/logger"
)

type Manager struct {
	log                logger.Logger
	clientMap          clients.ClientMap
	Events             chan *clients.SessionErrorEvent
	Errors             chan error
	RequestDataUpdates chan model.Integration // not pointer because it could change in other thread
}

func NewManager(log logger.Logger) *Manager {
	return &Manager{
		log:                log,
		clientMap:          make(clients.ClientMap),
		RequestDataUpdates: make(chan model.Integration, 100),
		Events:             make(chan *clients.SessionErrorEvent, 100),
		Errors:             make(chan error, 100),
	}
}

func (m *Manager) Update(i *model.Integration) (err error) {
	m.log.Info(context.Background(), "Integration initialization: %v\n", *i)
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
	m.log.Info(context.Background(), "Requesting all...")
	for _, c := range m.clientMap {
		go c.Request()
	}
}
