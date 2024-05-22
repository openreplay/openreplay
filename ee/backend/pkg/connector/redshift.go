package connector

import (
	"context"
	"database/sql"
	"fmt"

	_ "github.com/lib/pq"

	"openreplay/backend/internal/config/connector"
	"openreplay/backend/pkg/logger"
)

type Redshift struct {
	log     logger.Logger
	cfg     *connector.Config
	ctx     context.Context
	db      *sql.DB
	batches *Batches
}

func NewRedshift(log logger.Logger, cfg *connector.Config, batches *Batches) (*Redshift, error) {
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
		log:     log,
		cfg:     cfg,
		ctx:     context.Background(),
		db:      sqldb,
		batches: batches,
	}, nil
}

func (r *Redshift) InsertSessions(batch []map[string]string) error {
	fileName := generateName(r.cfg.SessionsTableName)
	if err := r.batches.Insert(batch, fileName, sessionColumns); err != nil {
		return fmt.Errorf("can't insert sessions batch: %s", err)
	}
	// Copy data from s3 bucket to redshift
	if err := r.copy(r.cfg.SessionsTableName, fileName, "|", true, false); err != nil {
		return fmt.Errorf("can't copy data from s3 to redshift: %s", err)
	}
	r.log.Info(context.Background(), "sessions batch of %d sessions is successfully saved", len(batch))
	return nil
}

func (r *Redshift) InsertEvents(batch []map[string]string) error {
	fileName := generateName(r.cfg.EventsTableName)
	if err := r.batches.Insert(batch, fileName, eventColumns); err != nil {
		return fmt.Errorf("can't insert events batch: %s", err)
	}
	// Copy data from s3 bucket to redshift
	if err := r.copy(r.cfg.EventsTableName, fileName, "|", true, false); err != nil {
		return fmt.Errorf("can't copy data from s3 to redshift: %s", err)
	}
	r.log.Info(context.Background(), "events batch of %d events is successfully saved", len(batch))
	return nil
}

func (r *Redshift) copy(tableName, fileName, delimiter string, creds, gzip bool) error {
	var (
		credentials string
		gzipSQL     string
	)
	if creds {
		if r.cfg.AWSAccessKeyID != "" && r.cfg.AWSSecretAccessKey != "" {
			credentials = fmt.Sprintf(`ACCESS_KEY_ID '%s' SECRET_ACCESS_KEY '%s'`, r.cfg.AWSAccessKeyID, r.cfg.AWSSecretAccessKey)
		} else if r.cfg.AWSIAMRole != "" {
			credentials = fmt.Sprintf(`IAM_ROLE '%s'`, r.cfg.AWSIAMRole)
		} else {
			credentials = "IAM_ROLE default"
		}
	}
	if gzip {
		gzipSQL = "GZIP"
	}

	filePath := fmt.Sprintf("s3://%s/%s", r.cfg.Redshift.Bucket, fileName)

	copySQL := fmt.Sprintf(`COPY "%s" FROM '%s' WITH %s TIMEFORMAT 'auto' DATEFORMAT 'auto' TRUNCATECOLUMNS STATUPDATE ON %s DELIMITER AS '%s' IGNOREHEADER 1 REMOVEQUOTES ESCAPE TRIMBLANKS EMPTYASNULL ACCEPTANYDATE`,
		tableName, filePath, gzipSQL, credentials, delimiter)
	r.log.Debug(context.Background(), "Executing COPY SQL: %s", copySQL)

	_, err := r.db.ExecContext(r.ctx, copySQL)
	return err
}

func (r *Redshift) Close() error {
	return r.db.Close()
}
