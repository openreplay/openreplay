package integrations

import (
	"context"
	"fmt"
	"strings"
	"time"

	config "openreplay/backend/internal/config/integrations"
	"openreplay/backend/pkg/intervals"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/queue/types"
	"openreplay/backend/pkg/token"
)

type Listener struct {
	log       logger.Logger
	cfg       *config.Config
	storage   Storage
	producer  types.Producer
	manager   *Manager
	tokenizer *token.Tokenizer
	Errors    chan error
}

func New(log logger.Logger, cfg *config.Config, storage Storage, producer types.Producer, manager *Manager, tokenizer *token.Tokenizer) (*Listener, error) {
	listener := &Listener{
		log:       log,
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
			log.Error(context.Background(), "integration parse error: %v | integration: %v", err, *i)
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
			l.log.Info(context.Background(), "new integration event: %+v", *event.IntegrationEvent)
			sessionID := event.SessionID
			if sessionID == 0 {
				sessData, err := l.tokenizer.Parse(event.Token)
				if err != nil && err != token.EXPIRED {
					l.log.Error(context.Background(), "error on token parsing: %v; token: %v", err, event.Token)
					continue
				}
				sessionID = sessData.ID
			}
			// Why do we produce integration events to analytics topic
			l.producer.Produce(l.cfg.TopicAnalytics, sessionID, event.IntegrationEvent.Encode())
		case err := <-l.manager.Errors:
			l.log.Error(context.Background(), "integration error: %v", err)
		case i := <-l.manager.RequestDataUpdates:
			if err := l.storage.Update(&i); err != nil {
				l.log.Error(context.Background(), "Postgres update request_data error: %v", err)
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
			l.log.Info(context.Background(), "integration update: %v", *newNotification)
			err = l.manager.Update(newNotification)
			if err != nil {
				l.log.Error(context.Background(), "integration parse error: %v | integration: %v", err, *newNotification)
			}
		}
	}
}

func (l *Listener) Close() error {
	return l.storage.UnListen()
}
