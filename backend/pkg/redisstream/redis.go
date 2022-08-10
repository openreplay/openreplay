package redisstream

import (
	"log"
	"regexp"

	"github.com/go-redis/redis"

	"openreplay/backend/pkg/env"
)

var redisClient *redis.Client

func getRedisClient() *redis.Client {
	if redisClient != nil {
		return redisClient
	}

	connectionString := env.String("REDIS_STRING")

	match, _ := regexp.MatchString("^[^:]+://", connectionString)
	if !match {
		connectionString = "redis://" + connectionString
	}

	options, err := redis.ParseURL(connectionString)
	if err != nil {
		log.Fatalln(err)
	}

	redisClient = redis.NewClient(options)
	if _, err := redisClient.Ping().Result(); err != nil {
		log.Fatalln(err)
	}
	return redisClient
}
