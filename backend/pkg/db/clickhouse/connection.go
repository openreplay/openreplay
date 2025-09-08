package clickhouse

import (
	"context"
	"fmt"
	"openreplay/backend/internal/config/common"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

func NewConnection(cfg common.Clickhouse) (driver.Conn, error) {
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
	}
	switch cfg.CompressionAlgo {
	case "lz4":
		opts.Compression = &clickhouse.Compression{
			Method: clickhouse.CompressionLZ4,
		}
	}
	var conn driver.Conn
	var err error
	if conn, err = clickhouse.Open(opts); err != nil {
		return nil, err
	}
	if err := conn.Ping(context.Background()); err != nil {
		if exception, ok := err.(*clickhouse.Exception); ok {
			fmt.Printf("Exception [%d] %s \n%s\n", exception.Code, exception.Message, exception.StackTrace)
		}
		return nil, err
	}
	return conn, err
}
