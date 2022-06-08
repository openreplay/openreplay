package integrations

import "openreplay/backend/pkg/env"

type Config struct {
	TopicRawWeb string
	PostgresURI string
	TokenSecret string
}

func New() *Config {
	return &Config{
		TopicRawWeb: env.String("TOPIC_RAW_WEB"),
		PostgresURI: env.String("POSTGRES_STRING"),
		TokenSecret: env.String("TOKEN_SECRET"),
	}
}
