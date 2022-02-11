package main

import (
	"log"
	"time"

	"os"
	"os/signal"
	"syscall"

	"openreplay/backend/pkg/db/postgres"
	"openreplay/backend/pkg/env"
	"openreplay/backend/pkg/intervals"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/token"
	"openreplay/backend/services/integrations/clientManager"
)

func main() {
	log.SetFlags(log.LstdFlags | log.LUTC | log.Llongfile)
	TOPIC_RAW_WEB := env.String("TOPIC_RAW_WEB")
	POSTGRES_STRING := env.String("POSTGRES_STRING")

	pg := postgres.NewConn(POSTGRES_STRING)
	defer pg.Close()

	tokenizer := token.NewTokenizer(env.String("TOKEN_SECRET"))

	manager := clientManager.NewManager()

	pg.IterateIntegrationsOrdered(func(i *postgres.Integration, err error) {
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

	producer := queue.NewProducer()
	defer producer.Close(15000)

	listener, err := postgres.NewIntegrationsListener(POSTGRES_STRING)
	if err != nil {
		log.Printf("Postgres listener error: %v\n", err)
		log.Fatalf("Postgres listener error")
	}
	defer listener.Close()

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
			pg.Close()
			os.Exit(0)
		case <-tick:
			log.Printf("Requesting all...\n")
			manager.RequestAll()
		case event := <-manager.Events:
			log.Printf("New integration event: %+v\n", *event.RawErrorEvent)
			sessionID := event.SessionID
			if sessionID == 0 {
				sessData, err := tokenizer.Parse(event.Token)
				if err != nil && err != token.EXPIRED {
					log.Printf("Error on token parsing: %v; Token: %v", err, event.Token)
					continue
				}
				sessionID = sessData.ID
			}
			// TODO: send to ready-events topic. Otherwise it have to go through the events worker. 
			producer.Produce(TOPIC_RAW_WEB, sessionID, messages.Encode(event.RawErrorEvent))
		case err := <-manager.Errors:
			log.Printf("Integration error: %v\n", err)
			listener.Close()
			pg.Close()
			os.Exit(0)
		case i := <-manager.RequestDataUpdates:
			// log.Printf("Last request integration update: %v || %v\n", i, string(i.RequestData))
			if err := pg.UpdateIntegrationRequestData(&i); err != nil {
				log.Printf("Postgres Update request_data error: %v\n", err)
			}
		case err := <-listener.Errors:
			log.Printf("Postgres listen error: %v\n", err)
			listener.Close()
			pg.Close()
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
