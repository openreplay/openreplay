package postgres

import (
	"encoding/json"
)

//go:generate $GOPATH/bin/easytags $GOFILE json

type Integration struct {
	ProjectID uint32 `json:"project_id"`
	Provider  string `json:"provider"`
	//DeletedAt *int64    `json:"deleted_at"`
	RequestData json.RawMessage `json:"request_data"`
	Options     json.RawMessage `json:"options"`
}

func (pg *Conn) IterateIntegrationsOrdered(iter func(integration *Integration, err error)) error {
	rows, err := pg.query(`
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

func (pg *Conn) UpdateIntegrationRequestData(i *Integration) error {
	return pg.exec(`
		UPDATE integrations 
		SET request_data = $1 
		WHERE project_id=$2 AND provider=$3`,
		i.RequestData, i.ProjectID, i.Provider,
	)
}
