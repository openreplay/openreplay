package connector

import (
	"bytes"
	"fmt"

	"github.com/google/uuid"

	"openreplay/backend/internal/config/connector"
	"openreplay/backend/pkg/objectstorage"
)

type Batches struct {
	cfg        *connector.Config
	objStorage objectstorage.ObjectStorage
}

func NewBatches(cfg *connector.Config, objStorage objectstorage.ObjectStorage) (*Batches, error) {
	return &Batches{
		cfg:        cfg,
		objStorage: objStorage,
	}, nil
}

func (ds *Batches) Insert(batch []map[string]string, fileName string, columns []string) error {
	buf := dataToCSV(batch, columns)
	reader := bytes.NewReader(buf.Bytes())
	if err := ds.objStorage.Upload(reader, fileName, "text/csv", "", objectstorage.NoCompression); err != nil {
		return fmt.Errorf("can't upload file to s3: %s", err)
	}
	return nil
}

func generateName(table string) string {
	return fmt.Sprintf("connector_data/%s-%s.csv", table, uuid.New().String())
}

func dataToCSV(batch []map[string]string, columns []string) *bytes.Buffer {
	buf := bytes.NewBuffer(nil)

	// Write header (column names)
	for _, column := range columns {
		buf.WriteString(column + "|")
	}
	buf.Truncate(buf.Len() - 1)

	// Write data (rows)
	for _, data := range batch {
		buf.WriteString("\n")
		for _, column := range columns {
			buf.WriteString(data[column] + "|")
		}
		buf.Truncate(buf.Len() - 1)
	}
	return buf
}
