package projects

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"

	"openreplay/backend/pkg/cache"
	"openreplay/backend/pkg/db/postgres/pool"
)

var errNotReached = errors.New("the DB should not have been queried")

type fakeTenantCache struct {
	byKey map[string]*Project
}

func (f *fakeTenantCache) Set(project *Project) error { return nil }

func (f *fakeTenantCache) GetByID(projectID uint32) (*Project, error) {
	return nil, ErrDisabledCache
}

func (f *fakeTenantCache) GetByKey(projectKey string) (*Project, error) {
	if p, ok := f.byKey[projectKey]; ok {
		return p, nil
	}
	return nil, ErrDisabledCache
}

type fakeRow struct {
	projectID uint32
	err       error
}

func (r fakeRow) Scan(dest ...interface{}) error {
	if r.err != nil {
		return r.err
	}
	for _, d := range dest {
		if v, ok := d.(*uint32); ok {
			*v = r.projectID
		}
	}
	return nil
}

type fakePool struct {
	tenantID int
	row      fakeRow
}

func (p *fakePool) Query(sql string, args ...interface{}) (pgx.Rows, error) { return nil, nil }
func (p *fakePool) QueryRow(sql string, args ...interface{}) pgx.Row {
	if len(args) < 2 || args[1] != p.tenantID {
		return fakeRow{err: pgx.ErrNoRows}
	}
	return p.row
}
func (p *fakePool) Exec(sql string, arguments ...interface{}) error { return nil }
func (p *fakePool) ExecContext(ctx context.Context, sql string, arguments ...interface{}) error {
	return nil
}
func (p *fakePool) SendBatch(b *pgx.Batch) pgx.BatchResults { return nil }
func (p *fakePool) Begin() (*pool.Tx, error)                { return nil, nil }
func (p *fakePool) Ping(ctx context.Context) error          { return nil }
func (p *fakePool) Close()                                  {}

func TestGetProjectByKeyAndTenant_CacheTenantMismatch(t *testing.T) {
	const key = "shared-key"
	redisCache := &fakeTenantCache{byKey: map[string]*Project{
		key: {ProjectID: 7, ProjectKey: key, TenantID: 1},
	}}
	c := &projectsImpl{
		cache:          redisCache,
		projectsByID:   cache.New(time.Minute, time.Minute),
		projectsByKeys: cache.New(time.Minute, time.Minute),
		db: &fakePool{tenantID: 2, row: fakeRow{
			projectID: 9,
		}},
	}

	got, err := c.GetProjectByKeyAndTenant(key, 2)
	if err != nil {
		t.Fatalf("unexpected error: %s", err)
	}
	if got.ProjectID != 9 {
		t.Fatalf("expected the DB result for the correct tenant (project 9), got the cached other-tenant project %d", got.ProjectID)
	}
}

func TestGetProjectByKeyAndTenant_CacheTenantMatch(t *testing.T) {
	const key = "shared-key"
	redisCache := &fakeTenantCache{byKey: map[string]*Project{
		key: {ProjectID: 7, ProjectKey: key, TenantID: 1},
	}}
	c := &projectsImpl{
		cache:          redisCache,
		projectsByID:   cache.New(time.Minute, time.Minute),
		projectsByKeys: cache.New(time.Minute, time.Minute),
		db:             &fakePool{tenantID: 1, row: fakeRow{err: errNotReached}},
	}

	got, err := c.GetProjectByKeyAndTenant(key, 1)
	if err != nil {
		t.Fatalf("unexpected error: %s", err)
	}
	if got.ProjectID != 7 {
		t.Fatalf("expected the cached project for the matching tenant, got %d", got.ProjectID)
	}
}

func TestGetProjectByKeyAndTenant_OtherTenantKeyRejected(t *testing.T) {
	const key = "shared-key"
	redisCache := &fakeTenantCache{byKey: map[string]*Project{
		key: {ProjectID: 7, ProjectKey: key, TenantID: 1},
	}}
	c := &projectsImpl{
		cache:          redisCache,
		projectsByID:   cache.New(time.Minute, time.Minute),
		projectsByKeys: cache.New(time.Minute, time.Minute),
		db:             &fakePool{tenantID: 1, row: fakeRow{projectID: 7}},
	}

	got, err := c.GetProjectByKeyAndTenant(key, 2)
	if !errors.Is(err, pgx.ErrNoRows) {
		t.Fatalf("expected pgx.ErrNoRows for another tenant's key, got err=%v project=%v", err, got)
	}
	if got != nil {
		t.Fatalf("expected no project for another tenant's key, got project %d", got.ProjectID)
	}
	if _, ok := c.projectsByKeys.Get(key + ":2"); ok {
		t.Fatalf("other tenant's project must not be cached for tenant 2")
	}
}
