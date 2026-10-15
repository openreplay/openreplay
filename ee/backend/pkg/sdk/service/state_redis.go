package service

import (
	"context"
	"encoding/json"
	"strconv"
	"time"

	goredis "github.com/redis/go-redis/v9"

	"openreplay/backend/pkg/db/redis"
	"openreplay/backend/pkg/sdk/model"
)

const redisOpTimeout = 500 * time.Millisecond

var (
	createScript = goredis.NewScript(`
		if redis.call('EXISTS', KEYS[1]) == 1 then return 0 end
		redis.call('HSET', KEYS[1], 'u', ARGV[1], 'v', '0')
		redis.call('PEXPIRE', KEYS[1], ARGV[2])
		return 1`)
	storeScript = goredis.NewScript(`
		if redis.call('HGET', KEYS[1], 'v') ~= ARGV[2] then return 0 end
		redis.call('HSET', KEYS[1], 'u', ARGV[1], 'v', tostring(tonumber(ARGV[2]) + 1))
		redis.call('PEXPIRE', KEYS[1], ARGV[3])
		return 1`)
)

type redisState struct {
	redis *goredis.Client
	ttl   time.Duration
}

func newRedisState(client *redis.Client, ttl time.Duration) userState {
	if client == nil || client.Redis == nil {
		return nil
	}
	return &redisState{redis: client.Redis, ttl: ttl}
}

func stateKey(key string) string {
	return "pa:user:" + key
}

func decodeUser(raw string) (*model.User, error) {
	user := &model.User{}
	if err := json.Unmarshal([]byte(raw), user); err != nil {
		return nil, err
	}
	if user.Properties == nil {
		user.Properties = make(map[string]interface{})
	}
	return user, nil
}

func (s *redisState) load(key string) (*model.User, uint64, bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), redisOpTimeout)
	defer cancel()
	vals, err := s.redis.HMGet(ctx, stateKey(key), "u", "v").Result()
	if err != nil {
		return nil, 0, false, err
	}
	if vals[0] == nil || vals[1] == nil {
		return nil, 0, false, nil
	}
	user, err := decodeUser(vals[0].(string))
	if err != nil {
		return nil, 0, false, err
	}
	version, err := strconv.ParseUint(vals[1].(string), 10, 64)
	if err != nil {
		return nil, 0, false, err
	}
	return user, version, true, nil
}

func (s *redisState) loadMany(keys []string) (map[string]*model.User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), redisOpTimeout*4)
	defer cancel()
	pipe := s.redis.Pipeline()
	cmds := make([]*goredis.StringCmd, len(keys))
	for i, k := range keys {
		cmds[i] = pipe.HGet(ctx, stateKey(k), "u")
	}
	if _, err := pipe.Exec(ctx); err != nil && err != goredis.Nil {
		return nil, err
	}
	out := make(map[string]*model.User, len(keys))
	for i, cmd := range cmds {
		raw, err := cmd.Result()
		if err != nil {
			continue
		}
		if user, err := decodeUser(raw); err == nil {
			out[keys[i]] = user
		}
	}
	return out, nil
}

func (s *redisState) create(key string, user *model.User) (bool, error) {
	raw, err := json.Marshal(user)
	if err != nil {
		return false, err
	}
	ctx, cancel := context.WithTimeout(context.Background(), redisOpTimeout)
	defer cancel()
	n, err := createScript.Run(ctx, s.redis, []string{stateKey(key)}, raw, s.ttl.Milliseconds()).Int()
	return n == 1, err
}

func (s *redisState) store(key string, user *model.User, version uint64) (bool, error) {
	raw, err := json.Marshal(user)
	if err != nil {
		return false, err
	}
	ctx, cancel := context.WithTimeout(context.Background(), redisOpTimeout)
	defer cancel()
	n, err := storeScript.Run(ctx, s.redis, []string{stateKey(key)}, raw, strconv.FormatUint(version, 10), s.ttl.Milliseconds()).Int()
	return n == 1, err
}

func (s *redisState) delete(key string) error {
	ctx, cancel := context.WithTimeout(context.Background(), redisOpTimeout)
	defer cancel()
	return s.redis.Del(ctx, stateKey(key)).Err()
}
