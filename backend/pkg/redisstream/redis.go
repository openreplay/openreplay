package redisstream

import (
	"log"
	
	"github.com/go-redis/redis"

	"openreplay/backend/pkg/env"
)


var redisClient  *redis.Client


func getRedisClient() *redis.Client {
	if redisClient != nil {
		return redisClient
	}
	redisClient = redis.NewClient(&redis.Options{
		Addr: env.String("REDIS_STRING"),
	})
	if _, err := redisClient.Ping().Result(); err != nil {
		log.Fatalln(err)
	}
	return redisClient
}