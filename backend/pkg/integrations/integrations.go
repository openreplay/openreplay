package integrations

import (
	"context"
	"encoding/json"
	"fmt"
	"openreplay/backend/pkg/db/postgres/pool"

	"github.com/jackc/pgx/v4"
)

type Listener struct {
	conn         *pgx.Conn
	db           pool.Pool
	Integrations chan *Integration
	Errors       chan error
}

type Integration struct {
	ProjectID   uint32          `json:"project_id"`
	Provider    string          `json:"provider"`
	RequestData json.RawMessage `json:"request_data"`
	Options     json.RawMessage `json:"options"`
}

func New(db pool.Pool, url string) (*Listener, error) {
	conn, err := pgx.Connect(context.Background(), url)
	if err != nil {
		return nil, err
	}
	listener := &Listener{
		conn:   conn,
		db:     db,
		Errors: make(chan error),
	}
	listener.Integrations = make(chan *Integration, 50)
	if _, err := conn.Exec(context.Background(), "LISTEN integration"); err != nil {
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
		}
	}
}

func (listener *Listener) Close() error {
	return listener.conn.Close(context.Background())
}

func (listener *Listener) IterateIntegrationsOrdered(iter func(integration *Integration, err error)) error {
	rows, err := listener.db.Query(`
		SELECT project_id, provider, options, request_data
		FROM integrations
	`)
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		i := new(Integration)
		if err := rows.Scan(&i.ProjectID, &i.Provider, &i.Options, &i.RequestData); err != nil {
			iter(nil, err)
			continue
		}
		iter(i, nil)
	}

	if err = rows.Err(); err != nil {
		return err
	}
	return nil
}

func (listener *Listener) UpdateIntegrationRequestData(i *Integration) error {
	return listener.db.Exec(`
		UPDATE integrations 
		SET request_data = $1 
		WHERE project_id=$2 AND provider=$3`,
		i.RequestData, i.ProjectID, i.Provider,
	)
}
