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

const maxTimestampSkew = 30 * 24 * time.Hour

func datetime(timestamp uint64) time.Time {
	return datetimeAt(timestamp, time.Now())
}

func datetimeAt(timestamp uint64, now time.Time) time.Time {
	t := time.Unix(int64(timestamp/1e3), 0)
	if t.Before(now.Add(-maxTimestampSkew)) || t.After(now.Add(maxTimestampSkew)) {
		return now
	}
	return t
}
