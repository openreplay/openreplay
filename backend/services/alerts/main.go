package main

import (
	"database/sql"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"openreplay/backend/pkg/db/postgres"
	"openreplay/backend/pkg/env"
	_ "github.com/lib/pq"
)

func main() {
	log.SetFlags(log.LstdFlags | log.LUTC | log.Llongfile)
	POSTGRES_STRING := env.String("POSTGRES_STRING")
	NOTIFICATIONS_STRING := env.String("ALERT_NOTIFICATION_STRING")
	log.Printf("Notifications: %s \nPG: %s\n", NOTIFICATIONS_STRING, POSTGRES_STRING)
	pg := postgres.NewConn(POSTGRES_STRING)
	defer pg.Close()

	pgs, err := sql.Open("postgres", POSTGRES_STRING+ "?sslmode=disable")
	if err != nil {
		log.Fatal(err)
	}
	defer pgs.Close()

	manager := NewManager(NOTIFICATIONS_STRING, POSTGRES_STRING, pgs, pg)
	if err := pg.IterateAlerts(func(a *postgres.Alert, err error) {
		if err != nil {
			log.Printf("Postgres error: %v\n", err)
			return
		}
		log.Printf("Alert initialization: %+v\n", *a)
		//log.Printf("CreatedAt: %s\n", *a.CreatedAt)
		err = manager.Update(a)
		if err != nil {
			log.Printf("Alert parse error: %v | Alert: %+v\n", err, *a)
			return
		}
	}); err != nil {
		log.Fatalf("Postgres error: %v\n", err)
	}

	listener, err := postgres.NewAlertsListener(POSTGRES_STRING)
	if err != nil {
		log.Fatalf("Postgres listener error: %v\n", err)
	}
	defer listener.Close()

	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)

	tickAlert := time.Tick(1 * time.Minute)

	log.Printf("Alert service started\n")
	manager.RequestAll()
	//return
	for {
		select {
		case sig := <-sigchan:
			log.Printf("Caught signal %v: terminating\n", sig)
			listener.Close()
			pg.Close()
			os.Exit(0)
		case <-tickAlert:
			log.Printf("Requesting all...%d alerts\n", manager.Length())
			manager.RequestAll()
		case iPointer := <-listener.Alerts:
			log.Printf("Alert update: %+v\n", *iPointer)
			//log.Printf("CreatedAt: %s\n", *iPointer.CreatedAt)
			//log.Printf("Notification received for AlertId: %d\n", iPointer.AlertID)
			err := manager.Update(iPointer)
			if err != nil {
				log.Printf("Alert parse error: %+v | Alert: %v\n", err, *iPointer)
			}
		case err := <-listener.Errors:
			log.Printf("listener error: %v\n", err)
			if err.Error() == "conn closed" {
				panic("Listener conn lost")
			}
		}
	}
}
