package connector

import (
	"bytes"
	"context"
	"database/sql"
	"fmt"

	"github.com/google/uuid"
	_ "github.com/lib/pq"

	"openreplay/backend/internal/config/connector"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/objectstorage"
)

type Redshift struct {
	log        logger.Logger
	cfg        *connector.Config
	ctx        context.Context
	db         *sql.DB
	objStorage objectstorage.ObjectStorage
}

func NewRedshift(log logger.Logger, cfg *connector.Config, objStorage objectstorage.ObjectStorage) (*Redshift, error) {
	var source string
	if cfg.ConnectionString != "" {
		source = cfg.ConnectionString
	} else {
		source = fmt.Sprintf("postgres://%s:%s@%s:%d/%s",
			cfg.Redshift.User, cfg.Redshift.Password, cfg.Redshift.Host, cfg.Redshift.Port, cfg.Redshift.Database)
	}
	log.Info(context.Background(), "Connecting to Redshift Source: ", source)
	sqldb, err := sql.Open("postgres", source)
	if err != nil {
		return nil, err
	}
	if err := sqldb.Ping(); err != nil {
		return nil, err
	}
	return &Redshift{
		log:        log,
		cfg:        cfg,
		ctx:        context.Background(),
		db:         sqldb,
		objStorage: objStorage,
	}, nil
}

func eventsToBuffer(batch []map[string]string) *bytes.Buffer {
	buf := bytes.NewBuffer(nil)

	// Write header
	for _, column := range eventColumns {
		buf.WriteString(column + "|")
	}
	buf.Truncate(buf.Len() - 1)

	// Write data
	for _, event := range batch {
		buf.WriteString("\n")
		for _, column := range eventColumns {
			buf.WriteString(event[column] + "|")
		}
		buf.Truncate(buf.Len() - 1)
	}
	return buf
}

func (r *Redshift) InsertEvents(batch []map[string]string) error {
	// Send data to S3
	fileName := fmt.Sprintf("connector_data/%s-%s.csv", r.cfg.EventsTableName, uuid.New().String())
	// Create csv file
	buf := eventsToBuffer(batch)

	reader := bytes.NewReader(buf.Bytes())
	if err := r.objStorage.Upload(reader, fileName, "text/csv", objectstorage.NoCompression); err != nil {
		return fmt.Errorf("can't upload file to s3: %s", err)
	}
	// Copy data from s3 bucket to redshift
	if err := r.Copy(r.cfg.EventsTableName, fileName, "|", true, false); err != nil {
		return fmt.Errorf("can't copy data from s3 to redshift: %s", err)
	}
	r.log.Info(context.Background(), "events batch of %d events is successfully saved", len(batch))
	return nil
}

func sessionsToBuffer(batch []map[string]string) *bytes.Buffer {
	buf := bytes.NewBuffer(nil)

	// Write header
	for _, column := range sessionColumns {
		buf.WriteString(column + "|")
	}
	buf.Truncate(buf.Len() - 1)

	// Write data
	for _, sess := range batch {
		buf.WriteString("\n")
		for _, column := range sessionColumns {
			buf.WriteString(sess[column] + "|")
		}
		buf.Truncate(buf.Len() - 1)
	}
	return buf
}

func (r *Redshift) InsertSessions(batch []map[string]string) error {
	// Send data to S3
	fileName := fmt.Sprintf("connector_data/%s-%s.csv", r.cfg.SessionsTableName, uuid.New().String())
	// Create csv file
	buf := sessionsToBuffer(batch)

	reader := bytes.NewReader(buf.Bytes())
	if err := r.objStorage.Upload(reader, fileName, "text/csv", objectstorage.NoCompression); err != nil {
		return fmt.Errorf("can't upload file to s3: %s", err)
	}
	// Copy data from s3 bucket to redshift
	if err := r.Copy(r.cfg.SessionsTableName, fileName, "|", true, false); err != nil {
		return fmt.Errorf("can't copy data from s3 to redshift: %s", err)
	}
	r.log.Info(context.Background(), "sessions batch of %d sessions is successfully saved", len(batch))
	return nil
}

func (r *Redshift) Copy(tableName, fileName, delimiter string, creds, gzip bool) error {
	var (
		credentials string
		gzipSQL     string
	)
	if creds {
		credentials = fmt.Sprintf(`ACCESS_KEY_ID '%s' SECRET_ACCESS_KEY '%s'`, r.cfg.AWSAccessKeyID, r.cfg.AWSSecretAccessKey)
	}
	if gzip {
		gzipSQL = "GZIP"
	}

	bucketName := "rdshftbucket"
	filePath := fmt.Sprintf("s3://%s/%s", bucketName, fileName)

	copySQL := fmt.Sprintf(`COPY "%s" FROM '%s' WITH %s TIMEFORMAT 'auto' DATEFORMAT 'auto' TRUNCATECOLUMNS 
		STATUPDATE ON %s DELIMITER AS '%s' IGNOREHEADER 1 REMOVEQUOTES ESCAPE TRIMBLANKS EMPTYASNULL ACCEPTANYDATE`,
		tableName, filePath, gzipSQL, credentials, delimiter)

	_, err := r.db.ExecContext(r.ctx, copySQL)
	return err
}

func (r *Redshift) ExecutionDuration(fileName string) (int, error) {
	return 0, nil
}

func (r *Redshift) Close() error {
	return r.db.Close()
}
