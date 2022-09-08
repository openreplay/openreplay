package clickhouse

import (
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"openreplay/backend/pkg/license"
	"strings"
	"time"
)

// TODO: add ClickHouse metrics
func New(url string) (driver.Conn, error) {
	license.CheckLicense()
	url = strings.TrimPrefix(url, "tcp://")
	url = strings.TrimSuffix(url, "/default")
	return clickhouse.Open(&clickhouse.Options{
		Addr: []string{url},
		Auth: clickhouse.Auth{
			Database: "default",
		},
		MaxOpenConns:    20,
		MaxIdleConns:    15,
		ConnMaxLifetime: 3 * time.Minute,
		Compression: &clickhouse.Compression{
			Method: clickhouse.CompressionLZ4,
		},
	})
}
