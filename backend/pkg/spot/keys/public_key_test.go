package keys

import (
	"context"
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v4"

	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/server/user"
)

type keyRow struct {
	spotKey   string
	spotID    uint64
	userID    uint64
	expiredAt time.Time
}

type fakeRow struct {
	values []interface{}
	err    error
}

func (r *fakeRow) Scan(dest ...interface{}) error {
	if r.err != nil {
		return r.err
	}
	for i, d := range dest {
		switch d := d.(type) {
		case *uint64:
			*d = r.values[i].(uint64)
		case *string:
			*d = r.values[i].(string)
		case *time.Time:
			*d = r.values[i].(time.Time)
		default:
			return fmt.Errorf("unsupported scan dest %T", d)
		}
	}
	return nil
}

type fakePool struct {
	keys []keyRow
	sqls []string
	args [][]interface{}
}

func (p *fakePool) QueryRow(sql string, args ...interface{}) pgx.Row {
	p.sqls = append(p.sqls, sql)
	p.args = append(p.args, args)
	switch {
	case strings.Contains(sql, "FROM spots.keys"):
		for _, k := range p.keys {
			if k.spotKey != args[0] {
				continue
			}
			if strings.Contains(sql, "spot_id") && k.spotID != args[1] {
				continue
			}
			return &fakeRow{values: []interface{}{k.userID, k.expiredAt}}
		}
		return &fakeRow{err: pgx.ErrNoRows}
	case strings.Contains(sql, "FROM public.users"):
		return &fakeRow{values: []interface{}{uint64(1), "owner", "owner@example.com"}}
	case strings.Contains(sql, "INSERT INTO spots.keys"):
		return &fakeRow{values: []interface{}{args[1].(string), args[3].(uint64), args[4].(time.Time)}}
	}
	return &fakeRow{err: fmt.Errorf("unexpected sql: %s", sql)}
}

func (p *fakePool) Query(sql string, args ...interface{}) (pgx.Rows, error) {
	return nil, fmt.Errorf("not implemented")
}
func (p *fakePool) Exec(sql string, args ...interface{}) error {
	p.sqls = append(p.sqls, sql)
	p.args = append(p.args, args)
	return nil
}
func (p *fakePool) ExecContext(ctx context.Context, sql string, args ...interface{}) error {
	return p.Exec(sql, args...)
}
func (p *fakePool) SendBatch(b *pgx.Batch) pgx.BatchResults { return nil }
func (p *fakePool) Begin() (*pool.Tx, error)                { return nil, fmt.Errorf("not implemented") }
func (p *fakePool) Ping(ctx context.Context) error          { return nil }
func (p *fakePool) Close()                                  {}

func newKeysWithFake(rows ...keyRow) (Keys, *fakePool) {
	p := &fakePool{keys: rows}
	return NewKeys(logger.New(), p), p
}

func TestIsValidRejectsKeyIssuedForAnotherSpot(t *testing.T) {
	const spotA, spotB uint64 = 4012392957232141825, 4012392954161911296
	k, _ := newKeysWithFake(keyRow{spotKey: "key-a", spotID: spotA, userID: 7, expiredAt: time.Now().Add(time.Hour)})

	if _, err := k.IsValid("key-a", spotB); err == nil {
		t.Fatalf("key for spot %d must not authorize spot %d", spotA, spotB)
	}
}

func TestIsValidAcceptsKeyForItsOwnSpot(t *testing.T) {
	const spotA uint64 = 4012392957232141825
	k, _ := newKeysWithFake(keyRow{spotKey: "key-a", spotID: spotA, userID: 7, expiredAt: time.Now().Add(time.Hour)})

	u, err := k.IsValid("key-a", spotA)
	if err != nil {
		t.Fatalf("expected key to be valid for its own spot: %v", err)
	}
	if u.ID != 7 || u.AuthMethod != "public-key" {
		t.Fatalf("unexpected user %+v", u)
	}
}

func TestIsValidRejectsExpiredKey(t *testing.T) {
	const spotA uint64 = 1
	k, _ := newKeysWithFake(keyRow{spotKey: "key-a", spotID: spotA, userID: 7, expiredAt: time.Now().Add(-time.Minute)})

	if _, err := k.IsValid("key-a", spotA); err == nil {
		t.Fatal("expired key must be rejected")
	}
}

func TestSetStoresExpiryInUTC(t *testing.T) {
	k, p := newKeysWithFake()
	if _, err := k.Set(1, 3600, &user.User{ID: 7}); err != nil {
		t.Fatalf("set: %v", err)
	}
	assertTimeArgsAreUTC(t, p)

	p.sqls, p.args = nil, nil
	if _, err := k.Set(1, 0, &user.User{ID: 7}); err != nil {
		t.Fatalf("revoke: %v", err)
	}
	assertTimeArgsAreUTC(t, p)
}

func assertTimeArgsAreUTC(t *testing.T, p *fakePool) {
	t.Helper()
	seen := 0
	for i, args := range p.args {
		for j, a := range args {
			if ts, ok := a.(time.Time); ok {
				seen++
				if ts.Location() != time.UTC {
					t.Fatalf("query %d arg %d is in %s, expected UTC (timestamp columns drop the zone)", i, j, ts.Location())
				}
			}
		}
	}
	if seen == 0 {
		t.Fatal("expected at least one time argument")
	}
}
