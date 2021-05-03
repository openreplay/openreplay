package postgres

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/jackc/pgx/v4"


)

type Listener struct {
	conn         *pgx.Conn
	Integrations chan *Integration
	Alerts       chan *Alert
	Errors       chan error
}

func NewIntegrationsListener(url string) (*Listener, error) {
	conn, err := pgx.Connect(context.Background(), url)
	if err != nil {
		return nil, err
	}
	listener := &Listener{
		conn:   conn,
		Errors: make(chan error),
	}
	listener.Integrations = make(chan *Integration, 50)
	if _, err := conn.Exec(context.Background(), "LISTEN integration"); err != nil {
		return nil, err
	}
	go listener.listen()
	return listener, nil
}

func NewAlertsListener(url string) (*Listener, error) {
	conn, err := pgx.Connect(context.Background(), url)
	if err != nil {
		return nil, err
	}
	listener := &Listener{
		conn:   conn,
		Errors: make(chan error),
	}
	listener.Alerts = make(chan *Alert, 50)
	if _, err := conn.Exec(context.Background(), "LISTEN alert"); err != nil {
		return nil, err
	}
	go listener.listen()
	return listener, nil
}

func (listener *Listener) listen() {
	for {
		notification, err := listener.conn.WaitForNotification(context.Background())
		if err != nil {
			listener.Errors <- err
			continue
		}
		switch notification.Channel {
		case "integration":
			integrationP := new(Integration)
			if err := json.Unmarshal([]byte(notification.Payload), integrationP); err != nil {
				listener.Errors <- fmt.Errorf("%v | Payload: %v", err, notification.Payload)
			} else {
				listener.Integrations <- integrationP
			}
		case "alert":
			alertP := new(Alert)
			if err := json.Unmarshal([]byte(notification.Payload), alertP); err != nil {
				listener.Errors <- fmt.Errorf("%v | Payload: %v", err, notification.Payload)
			} else {
				listener.Alerts <- alertP
			}
		}
	}
}

func (listener *Listener) Close() error {
	return listener.conn.Close(context.Background())
}
