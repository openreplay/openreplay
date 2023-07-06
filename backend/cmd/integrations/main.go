package main

import (
	"log"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/integrations"
	"os"
	"os/signal"
	"syscall"
	"time"

	config "openreplay/backend/internal/config/integrations"
	"openreplay/backend/internal/integrations/clientManager"
	"openreplay/backend/pkg/intervals"
	"openreplay/backend/pkg/metrics"
	databaseMetrics "openreplay/backend/pkg/metrics/database"
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/token"
)

func main() {
	m := metrics.New()
	m.Register(databaseMetrics.List())

	log.SetFlags(log.LstdFlags | log.LUTC | log.Llongfile)

	cfg := config.New()

	// Init postgres connection
	pgConn, err := pool.New(cfg.Postgres.String())
	if err != nil {
		log.Printf("can't init postgres connection: %s", err)
		return
	}
	defer pgConn.Close()

	tokenizer := token.NewTokenizer(cfg.TokenSecret)

	manager := clientManager.NewManager()

	producer := queue.NewProducer(cfg.MessageSizeLimit, true)
	defer producer.Close(15000)

	// TODO: rework with integration manager
	listener, err := integrations.New(pgConn, cfg.Postgres.String())
	if err != nil {
		log.Printf("Postgres listener error: %v\n", err)
		log.Fatalf("Postgres listener error")
	}
	defer listener.Close()

	listener.IterateIntegrationsOrdered(func(i *integrations.Integration, err error) {
		if err != nil {
			log.Printf("Postgres error: %v\n", err)
			return
		}
		log.Printf("Integration initialization: %v\n", *i)
		err = manager.Update(i)
		if err != nil {
			log.Printf("Integration parse error: %v | Integration: %v\n", err, *i)
			return
		}
	})

	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)

	tick := time.Tick(intervals.INTEGRATIONS_REQUEST_INTERVAL * time.Millisecond)

	log.Printf("Integration service started\n")
	manager.RequestAll()
	for {
		select {
		case sig := <-sigchan:
			log.Printf("Caught signal %v: terminating\n", sig)
			listener.Close()
			pgConn.Close()
			os.Exit(0)
		case <-tick:
			log.Printf("Requesting all...\n")
			manager.RequestAll()
		case event := <-manager.Events:
			log.Printf("New integration event: %+v\n", *event.IntegrationEvent)
			sessionID := event.SessionID
			if sessionID == 0 {
				sessData, err := tokenizer.Parse(event.Token)
				if err != nil && err != token.EXPIRED {
					log.Printf("Error on token parsing: %v; Token: %v", err, event.Token)
					continue
				}
				sessionID = sessData.ID
			}
			producer.Produce(cfg.TopicAnalytics, sessionID, event.IntegrationEvent.Encode())
		case err := <-manager.Errors:
			log.Printf("Integration error: %v\n", err)
		case i := <-manager.RequestDataUpdates:
			// log.Printf("Last request integration update: %v || %v\n", i, string(i.RequestData))
			if err := listener.UpdateIntegrationRequestData(&i); err != nil {
				log.Printf("Postgres Update request_data error: %v\n", err)
			}
		case err := <-listener.Errors:
			log.Printf("Postgres listen error: %v\n", err)
			listener.Close()
			pgConn.Close()
			os.Exit(0)
		case iPointer := <-listener.Integrations:
			log.Printf("Integration update: %v\n", *iPointer)
			err := manager.Update(iPointer)
			if err != nil {
				log.Printf("Integration parse error: %v | Integration: %v\n", err, *iPointer)
			}
		}
	}
}
