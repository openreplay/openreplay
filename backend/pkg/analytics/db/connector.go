package db

import (
	"context"
	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"openreplay/backend/internal/config/common"
	"time"
)

type TableValue struct {
	Name  string `json:"name"`
	Total uint64 `json:"total"`
}

type TableResponse struct {
	Total  uint64       `json:"total"`
	Count  uint64       `json:"count"`
	Values []TableValue `json:"values"`
}

type Connector interface {
	Stop() error
	Query(query string) (driver.Rows, error)
	QueryRow(query string) (driver.Row, error)
	QueryArgs(query string, args map[string]interface{}) (driver.Rows, error)
}

type connectorImpl struct {
	conn driver.Conn
}

func NewConnector(cfg common.Clickhouse) (Connector, error) {
	conn, err := clickhouse.Open(&clickhouse.Options{
		Addr: []string{cfg.GetTrimmedURL()},
		Auth: clickhouse.Auth{
			Database: cfg.Database,
			Username: cfg.LegacyUserName,
			Password: cfg.LegacyPassword,
		},
		MaxOpenConns:    20,
		MaxIdleConns:    15,
		ConnMaxLifetime: 3 * time.Minute,
		Compression: &clickhouse.Compression{
			Method: clickhouse.CompressionLZ4,
		},
	})
	if err != nil {
		return nil, err
	}
	return &connectorImpl{conn: conn}, nil
}

func (c *connectorImpl) Stop() error {
	return c.conn.Close()
}

func (c *connectorImpl) Query(query string) (driver.Rows, error) {
	rows, err := c.conn.Query(context.Background(), query)
	if err != nil {
		return nil, err
	}
	//defer rows.Close()

	return rows, nil
}

func (c *connectorImpl) QueryRow(query string) (driver.Row, error) {
	row := c.conn.QueryRow(context.Background(), query)
	if err := row.Err(); err != nil {
		return nil, err
	}
	//defer row.Close()

	return row, nil
}

func (c *connectorImpl) QueryArgs(query string, args map[string]interface{}) (driver.Rows, error) {
	rows, err := c.conn.Query(context.Background(), query, args)
	if err != nil {
		return nil, err
	}
	//defer rows.Close()

	return rows, nil
}
