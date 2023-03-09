package heuristics

import (
	"openreplay/backend/internal/config/common"
	"openreplay/backend/internal/config/configurator"
	"openreplay/backend/pkg/pprof"
)

type Config struct {
	common.Config
	GroupHeuristics string `env:"GROUP_HEURISTICS,required"`
	TopicAnalytics  string `env:"TOPIC_ANALYTICS,required"`
	LoggerTimeout   int    `env:"LOG_QUEUE_STATS_INTERVAL_SEC,required"`
	TopicRawWeb     string `env:"TOPIC_RAW_WEB,required"`
	TopicRawIOS     string `env:"TOPIC_RAW_IOS,required"`
	ProducerTimeout int    `env:"PRODUCER_TIMEOUT,default=2000"`
	UseProfiler     bool   `env:"PROFILER_ENABLED,default=false"`
}

func New() *Config {
	cfg := &Config{}
	configurator.Process(cfg)
	if cfg.UseProfiler {
		pprof.StartProfilingServer()
	}
	return cfg
}
