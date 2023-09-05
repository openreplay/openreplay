package connector

import (
	"context"
	"database/sql"
	"fmt"
	"log"

	"openreplay/backend/internal/config/connector"

	_ "github.com/lib/pq"
)

type Redshift struct {
	cfg *connector.Config
	ctx context.Context
	db  *sql.DB
}

func NewRedshift(cfg *connector.Config) (*Redshift, error) {
	var source string
	if cfg.ConnectioString != "" {
		source = cfg.ConnectioString
	} else {
		source = fmt.Sprintf("postgres://%s:%s@%s:%d/%s", cfg.User, cfg.Password, cfg.Host, cfg.Port, cfg.Database)
	}
	log.Println("Connecting to Redshift Source: ", source)
	sqldb, err := sql.Open("postgres", source)
	if err != nil {
		return nil, err
	}
	if err := sqldb.Ping(); err != nil {
		return nil, err
	}
	return &Redshift{
		cfg: cfg,
		ctx: context.Background(),
		db:  sqldb,
	}, nil
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
	log.Printf("Running command: %s", copySQL)

	_, err := r.db.ExecContext(r.ctx, copySQL)
	return err
}

func (r *Redshift) ExecutionDuration(fileName string) (int, error) {
	return 0, nil
}

func (r *Redshift) Close() error {
	return r.db.Close()
}
