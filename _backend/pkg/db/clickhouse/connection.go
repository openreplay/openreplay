package clickhouse

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"errors"
	"fmt"
	"os"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/jmoiron/sqlx"

	"openreplay/backend/internal/config/common"
)

func NewConnection(cfg common.Clickhouse) (driver.Conn, error) {
	tlsConfig, err := buildTLSConfig(cfg)
	if err != nil {
		return nil, err
	}
	opts := &clickhouse.Options{
		Addr: []string{cfg.GetTrimmedURL()},
		Auth: clickhouse.Auth{
			Database: cfg.Database,
			Username: cfg.LegacyUserName,
			Password: cfg.LegacyPassword,
		},
		MaxOpenConns:    cfg.MaxOpenConns,
		MaxIdleConns:    cfg.MaxIdleConns,
		ConnMaxLifetime: cfg.ConnMaxLifetime,
		Debug:           cfg.DEBUG,
		Debugf: func(format string, v ...any) {
			fmt.Print("------ ClickHouse Debug ---\n")
			fmt.Printf(format+"\n", v...)
			fmt.Print("------ ---------- ----- ---\n")
		},
		Settings: clickhouse.Settings{
			"max_execution_time": cfg.MaxExecutionTime,
		},
		TLS: tlsConfig,
	}
	switch cfg.CompressionAlgo {
	case "lz4":
		opts.Compression = &clickhouse.Compression{
			Method: clickhouse.CompressionLZ4,
		}
	}
	var conn driver.Conn
	if conn, err = clickhouse.Open(opts); err != nil {
		return nil, err
	}
	if err := conn.Ping(context.Background()); err != nil {
		var exception *clickhouse.Exception
		if errors.As(err, &exception) {
			fmt.Printf("Exception [%d] %s \n%s\n", exception.Code, exception.Message, exception.StackTrace)
		}
		return nil, err
	}
	return conn, err
}
func NewSqlDBConnection(cfg common.Clickhouse) *sqlx.DB {
	opts := &clickhouse.Options{
		Protocol: clickhouse.HTTP,
		Addr:     []string{cfg.GetTrimmedUrlHTTP()},
		Auth: clickhouse.Auth{
			Database: cfg.Database,
			Username: cfg.LegacyUserName,
			Password: cfg.LegacyPassword,
		},
		Debug: cfg.DEBUG,
		Debugf: func(format string, v ...any) {
			fmt.Print("------ ClickHouse SQL-DB Debug ---\n")
			fmt.Printf(format+"\n", v...)
			fmt.Print("------ ---------- ----- ---\n")
		},
		Settings: clickhouse.Settings{
			"max_execution_time": cfg.MaxExecutionTime,
		},
	}
	switch cfg.CompressionAlgo {
	case "lz4":
		opts.Compression = &clickhouse.Compression{
			Method: clickhouse.CompressionLZ4,
		}
	}

	conn := clickhouse.OpenDB(opts)

	if err := conn.Ping(); err != nil {
		var exception *clickhouse.Exception
		if errors.As(err, &exception) {
			fmt.Printf("Exception SQL-DB [%d] %s \n%s\n", exception.Code, exception.Message, exception.StackTrace)
		}
		return nil
	}
	return sqlx.NewDb(conn, "clickhouse")
}

func buildTLSConfig(cfg common.Clickhouse) (*tls.Config, error) {
	if !cfg.UseTLS {
		return nil, nil
	}
	tlsConfig := &tls.Config{
		InsecureSkipVerify: cfg.TLSSkipVerify,
		MinVersion:         tls.VersionTLS12,
	}
	if cfg.TLSCertificatePath != "" || cfg.TLSKeyPath != "" {
		if cfg.TLSCertificatePath == "" || cfg.TLSKeyPath == "" {
			return nil, fmt.Errorf("both CLICKHOUSE_TLS_CERT_PATH and CLICKHOUSE_TLS_KEY_PATH must be set")
		}
		cert, err := tls.LoadX509KeyPair(cfg.TLSCertificatePath, cfg.TLSKeyPath)
		if err != nil {
			return nil, fmt.Errorf("failed to load ClickHouse client TLS certificate or key: %w", err)
		}
		tlsConfig.Certificates = []tls.Certificate{cert}
	}
	if cfg.TLSCACertificatePath != "" {
		caCert, err := os.ReadFile(cfg.TLSCACertificatePath)
		if err != nil {
			return nil, fmt.Errorf("failed to read ClickHouse CA certificate: %w", err)
		}
		caCertPool := x509.NewCertPool()
		if !caCertPool.AppendCertsFromPEM(caCert) {
			return nil, fmt.Errorf("failed to append ClickHouse CA certificate to pool")
		}
		tlsConfig.RootCAs = caCertPool
	}
	return tlsConfig, nil
}
