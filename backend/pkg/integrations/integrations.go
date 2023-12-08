package integrations

import (
	"fmt"
	"log"
	"strings"
	"time"

	config "openreplay/backend/internal/config/integrations"
	"openreplay/backend/pkg/intervals"
	"openreplay/backend/pkg/queue/types"
	"openreplay/backend/pkg/token"
)

type Listener struct {
	cfg       *config.Config
	storage   Storage
	producer  types.Producer
	manager   *Manager
	tokenizer *token.Tokenizer
	Errors    chan error
}

func New(cfg *config.Config, storage Storage, producer types.Producer, manager *Manager, tokenizer *token.Tokenizer) (*Listener, error) {
	listener := &Listener{
		cfg:       cfg,
		storage:   storage,
		Errors:    make(chan error),
		producer:  producer,
		manager:   manager,
		tokenizer: tokenizer,
	}
	ints, err := storage.GetAll()
	if err != nil {
		return nil, err
	}
	for _, i := range ints {
		// Add new integration to manager
		if err = manager.Update(i); err != nil {
			log.Printf("Integration parse error: %v | Integration: %v\n", err, *i)
		}
	}
	manager.RequestAll()
	go listener.worker()
	return listener, nil
}

func (l *Listener) worker() {
	clientsCheckTick := time.Tick(intervals.INTEGRATIONS_REQUEST_INTERVAL * time.Millisecond)

	for {
		select {
		case <-clientsCheckTick:
			l.manager.RequestAll()
		case event := <-l.manager.Events:
			log.Printf("New integration event: %+v\n", *event.IntegrationEvent)
			sessionID := event.SessionID
			if sessionID == 0 {
				sessData, err := l.tokenizer.Parse(event.Token)
				if err != nil && err != token.EXPIRED {
					log.Printf("Error on token parsing: %v; Token: %v", err, event.Token)
					continue
				}
				sessionID = sessData.ID
			}
			// Why do we produce integration events to analytics topic
			l.producer.Produce(l.cfg.TopicAnalytics, sessionID, event.IntegrationEvent.Encode())
		case err := <-l.manager.Errors:
			log.Printf("Integration error: %v\n", err)
		case i := <-l.manager.RequestDataUpdates:
			if err := l.storage.Update(&i); err != nil {
				log.Printf("Postgres Update request_data error: %v\n", err)
			}
		default:
			newNotification, err := l.storage.CheckNew()
			if err != nil {
				if strings.Contains(err.Error(), "context deadline exceeded") {
					continue
				}
				l.Errors <- fmt.Errorf("Integration storage error: %v", err)
				continue
			}
			log.Printf("Integration update: %v\n", *newNotification)
			err = l.manager.Update(newNotification)
			if err != nil {
				log.Printf("Integration parse error: %v | Integration: %v\n", err, *newNotification)
			}
		}
	}
}

func (l *Listener) Close() error {
	return l.storage.UnListen()
}
