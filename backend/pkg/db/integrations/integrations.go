package integrations

import (
	"encoding/json"
	"fmt"
	"openreplay/backend/pkg/db/postgres"
)

//go:generate $GOPATH/bin/easytags $GOFILE json
type Integration struct {
	ProjectID uint32 `json:"project_id"`
	Provider  string `json:"provider"`
	//DeletedAt *int64    `json:"deleted_at"`
	RequestData json.RawMessage `json:"request_data"`
	Options     json.RawMessage `json:"options"`
}

type Integrations interface {
	UpdateIntegrationRequestData(i *Integration) error
	IterateIntegrationsOrdered(iter func(integration *Integration, err error)) error
	Close()
}

type integrationsImpl struct {
	conn postgres.Pool
}

func New(conn postgres.Pool) (Integrations, error) {
	if conn == nil {
		return nil, fmt.Errorf("db connection is empty")
	}
	return &integrationsImpl{conn: conn}, nil
}

func (i *integrationsImpl) IterateIntegrationsOrdered(iter func(integration *Integration, err error)) error {
	rows, err := i.conn.Query(`
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

func (i *integrationsImpl) UpdateIntegrationRequestData(integration *Integration) error {
	return i.conn.Exec(`
		UPDATE integrations 
		SET request_data = $1 
		WHERE project_id=$2 AND provider=$3`,
		integration.RequestData, integration.ProjectID, integration.Provider,
	)
}

func (i *integrationsImpl) Close() {
	i.conn.Close()
}
