package heuristics

import (
	"openreplay/backend/pkg/env"
)

type Config struct {
	GroupHeuristics string
	TopicAnalytics  string
	LoggerTimeout   int
	TopicRawWeb     string
	TopicRawIOS     string
	ProducerTimeout int
}

func New() *Config {
	return &Config{
		GroupHeuristics: env.String("GROUP_HEURISTICS"),
		TopicAnalytics:  env.String("TOPIC_ANALYTICS"),
		LoggerTimeout:   env.Int("LOG_QUEUE_STATS_INTERVAL_SEC"),
		TopicRawWeb:     env.String("TOPIC_RAW_WEB"),
		TopicRawIOS:     env.String("TOPIC_RAW_IOS"),
		ProducerTimeout: 2000,
	}
}
