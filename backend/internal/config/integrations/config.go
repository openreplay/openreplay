package integrations

import "openreplay/backend/pkg/env"

type Config struct {
	TopicAnalytics string
	PostgresURI    string
	TokenSecret    string
}

func New() *Config {
	return &Config{
		TopicAnalytics: env.String("TOPIC_ANALYTICS"),
		PostgresURI:    env.String("POSTGRES_STRING"),
		TokenSecret:    env.String("TOKEN_SECRET"),
	}
}
