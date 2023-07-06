package redis

import (
	"errors"
	"github.com/go-redis/redis"
	config "openreplay/backend/internal/config/redis"
)

type Client struct {
	Cfg   *config.Redis
	Redis *redis.Client
}

func New(cfg *config.Redis) (*Client, error) {
	return nil, errors.New("not implemented")
}

func (c *Client) Close() error {
	return c.Redis.Close()
}
