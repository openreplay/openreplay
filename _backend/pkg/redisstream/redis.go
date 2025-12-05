package redisstream

import (
	"regexp"

	"github.com/docker/distribution/context"
	"github.com/redis/go-redis/v9"

	"openreplay/backend/pkg/env"
)

var redisClient *redis.Client

func getRedisClient() (*redis.Client, error) {
	if redisClient != nil {
		return redisClient, nil
	}

	connectionString := env.String("REDIS_STRING")

	match, _ := regexp.MatchString("^[^:]+://", connectionString)
	if !match {
		connectionString = "redis://" + connectionString
	}

	options, err := redis.ParseURL(connectionString)
	if err != nil {
		return nil, err
	}

	redisClient = redis.NewClient(options)
	if _, err := redisClient.Ping(context.Background()).Result(); err != nil {
		return nil, err
	}
	return redisClient, nil
}
