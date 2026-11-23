package jobs

import (
	"context"
	"errors"
	"io"
	"testing"
	"time"

	"openreplay/backend/pkg/objectstorage"
)

type nopLog struct{}

func (nopLog) Debug(context.Context, string, ...interface{}) {}
func (nopLog) Info(context.Context, string, ...interface{})  {}
func (nopLog) Warn(context.Context, string, ...interface{})  {}
func (nopLog) Error(context.Context, string, ...interface{}) {}
func (nopLog) Fatal(context.Context, string, ...interface{}) {}

type fakeStore struct {
	existing map[string]bool
	failKey  string
	tags     map[string]string
}

func (f *fakeStore) Upload(io.Reader, string, string, string, objectstorage.CompressionType) error {
	return nil
}
func (f *fakeStore) Get(string) (io.ReadCloser, error)              { return nil, nil }
func (f *fakeStore) Exists(key string) bool                         { return f.existing[key] }
func (f *fakeStore) GetCreationTime(string) *time.Time              { return nil }
func (f *fakeStore) GetPreSignedUploadUrl(string) (string, error)   { return "", nil }
func (f *fakeStore) GetPreSignedDownloadUrl(string) (string, error) { return "", nil }
func (f *fakeStore) GetPreSignedDownloadUrlFromBucket(string, string) (string, error) {
	return "", nil
}
func (f *fakeStore) Tag(key, tagKey, tagValue string) error {
	if key == f.failKey {
		return errors.New("s3 down")
	}
	if f.tags == nil {
		f.tags = map[string]string{}
	}
	f.tags[key] = tagKey + "=" + tagValue
	return nil
}

func TestMobKeys(t *testing.T) {
	want := []string{"42/dom.mob", "42/dom.mobs", "42/dom.mobe", "42/devtools.mob", "42", "42e", "42devtools"}
	got := mobKeys(42)
	if len(got) != len(want) {
		t.Fatalf("got %v", got)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Errorf("key %d: got %q want %q", i, got[i], want[i])
		}
	}
}

func TestTagMobsForDeletion(t *testing.T) {
	store := &fakeStore{existing: map[string]bool{"1/dom.mobs": true, "1/devtools.mob": true, "2": true}}
	j := &jobsImpl{log: nopLog{}, objStore: store, deleteInDay: "7"}
	if err := j.tagMobsForDeletion(context.Background(), []int64{1, 2, 3}); err != nil {
		t.Fatal(err)
	}
	if len(store.tags) != 3 || store.tags["1/dom.mobs"] != "to_delete_in_days=7" || store.tags["2"] != "to_delete_in_days=7" {
		t.Errorf("tags: %v", store.tags)
	}

	// a tagging failure is reported after trying every key
	store = &fakeStore{existing: map[string]bool{"1/dom.mobs": true, "1/dom.mobe": true}, failKey: "1/dom.mobs"}
	j = &jobsImpl{log: nopLog{}, objStore: store, deleteInDay: "7"}
	if err := j.tagMobsForDeletion(context.Background(), []int64{1}); err == nil {
		t.Error("tag error should be returned")
	}
	if store.tags["1/dom.mobe"] == "" {
		t.Error("remaining keys should still be tagged after a failure")
	}

	// no object storage: nothing to do
	if err := (&jobsImpl{log: nopLog{}}).tagMobsForDeletion(context.Background(), []int64{1}); err != nil {
		t.Error(err)
	}
	// cancelled context stops the loop
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if err := j.tagMobsForDeletion(ctx, []int64{1}); !errors.Is(err, context.Canceled) {
		t.Errorf("want context error, got %v", err)
	}
}

func TestCronJobIdentity(t *testing.T) {
	c := NewCronJob(nopLog{}, nil, nil, "7")
	if c.Name() != "run_scheduled_jobs" || c.DefaultSchedule() != "15 0 * * *" || c.RunTimeout() <= 0 {
		t.Errorf("identity: %s %s %s", c.Name(), c.DefaultSchedule(), c.RunTimeout())
	}
	impl := c.jobs.(*jobsImpl)
	if impl.deleteInDay != "7" {
		t.Errorf("deleteInDay: %q", impl.deleteInDay)
	}
}
