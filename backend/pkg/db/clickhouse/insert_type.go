package clickhouse

import (
	"time"
)

func nullableUint16(v uint16) *uint16 {
	var p *uint16 = nil
	if v != 0 {
		p = &v
	}
	return p
}

func nullableUint32(v uint32) *uint32 {
	var p *uint32 = nil
	if v != 0 {
		p = &v
	}
	return p
}

func nullableString(v string) *string {
	var p *string = nil
	if v != "" {
		p = &v
	}
	return p
}

func datetime(timestamp uint64) time.Time {
	t := time.Unix(int64(timestamp/1e3), 0)
	// Temporal solution for not correct timestamps in performance messages
	if t.Year() < 2022 || t.Year() > 2025 {
		return time.Now()
	}
	return t
}
