package integrations

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"openreplay/backend/pkg/integrations/model"
	"time"

	"github.com/jackc/pgx/v4"
)

type Storage interface {
	Listen() error
	UnListen() error
	CheckNew() (*model.Integration, error)
	GetAll() ([]*model.Integration, error)
	Update(i *model.Integration) error
}

type storageImpl struct {
	conn *pgx.Conn
}

func NewStorage(conn *pgx.Conn) Storage {
	return &storageImpl{
		conn: conn,
	}
}

func (s *storageImpl) Listen() error {
	_, err := s.conn.Exec(context.Background(), "LISTEN integration")
	return err
}

func (s *storageImpl) UnListen() error {
	_, err := s.conn.Exec(context.Background(), "UNLISTEN integration")
	return err
}

func (s *storageImpl) CheckNew() (*model.Integration, error) {
	ctx, _ := context.WithTimeout(context.Background(), 100*time.Millisecond)
	notification, err := s.conn.WaitForNotification(ctx)
	if err != nil {
		return nil, err
	}
	if notification.Channel == "integration" {
		integrationP := new(model.Integration)
		if err := json.Unmarshal([]byte(notification.Payload), integrationP); err != nil {
			return nil, err
		}
		return integrationP, nil
	}
	return nil, fmt.Errorf("unknown notification channel: %s", notification.Channel)
}

func (s *storageImpl) GetAll() ([]*model.Integration, error) {
	rows, err := s.conn.Query(context.Background(), `
		SELECT project_id, provider, options, request_data
		FROM integrations
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	integrations := make([]*model.Integration, 0)
	for rows.Next() {
		i := new(model.Integration)
		if err := rows.Scan(&i.ProjectID, &i.Provider, &i.Options, &i.RequestData); err != nil {
			log.Printf("Postgres scan error: %v\n", err)
			continue
		}
		integrations = append(integrations, i)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}
	return integrations, nil
}

func (s *storageImpl) Update(i *model.Integration) error {
	_, err := s.conn.Exec(context.Background(), `
		UPDATE integrations 
		SET request_data = $1 
		WHERE project_id=$2 AND provider=$3`,
		i.RequestData, i.ProjectID, i.Provider,
	)
	return err
}
