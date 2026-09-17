package user

import (
	"testing"
	"time"

	"openreplay/backend/pkg/cache"
)

func newTestUsersImpl() *usersImpl {
	return &usersImpl{userCache: cache.New(time.Minute, time.Minute)}
}

func TestUserCacheHit(t *testing.T) {
	u := newTestUsersImpl()
	key := "1:1:jwt_iat:100"
	want := &User{ID: 1, Name: "Alice"}
	u.userCache.Set(key, userCacheEntry{user: want, fetchedAt: time.Now()})

	got, err := u.getCachedUser(key)
	if err != nil {
		t.Fatalf("expected cache hit, got error: %v", err)
	}
	if got != want {
		t.Fatalf("expected cached user %v, got %v", want, got)
	}
}

func TestUserCacheMissOnExpiry(t *testing.T) {
	u := newTestUsersImpl()
	key := "1:1:jwt_iat:100"
	u.userCache.Set(key, userCacheEntry{user: &User{ID: 1}, fetchedAt: time.Now().Add(-userCacheTTL - time.Second)})

	if _, err := u.getCachedUser(key); err == nil {
		t.Fatalf("expected cache miss for expired entry")
	}
}

func TestUserCacheMissOnDifferentIat(t *testing.T) {
	u := newTestUsersImpl()
	u.userCache.Set("1:1:jwt_iat:100", userCacheEntry{user: &User{ID: 1}, fetchedAt: time.Now()})

	if _, err := u.getCachedUser("1:1:jwt_iat:200"); err == nil {
		t.Fatalf("expected cache miss when token iat changed (rotated token)")
	}
}

func TestUserCacheMissWhenAbsent(t *testing.T) {
	u := newTestUsersImpl()
	if _, err := u.getCachedUser("missing"); err == nil {
		t.Fatalf("expected cache miss for absent key")
	}
}
