package http

import (
	"openreplay/backend/internal/config/common"
	"openreplay/backend/internal/config/configurator"
	"openreplay/backend/pkg/env"
	"time"
)

type Config struct {
	common.Config
	common.Postgres
	HTTPHost                string        `env:"HTTP_HOST,default="`
	HTTPPort                string        `env:"HTTP_PORT,required"`
	HTTPTimeout             time.Duration `env:"HTTP_TIMEOUT,default=60s"`
	TopicRawWeb             string        `env:"TOPIC_RAW_WEB,required"`
	TopicRawIOS             string        `env:"TOPIC_RAW_IOS,required"`
	BeaconSizeLimit         int64         `env:"BEACON_SIZE_LIMIT,required"`
	CompressionThreshold    int64         `env:"COMPRESSION_THRESHOLD,default=20000"`
	JsonSizeLimit           int64         `env:"JSON_SIZE_LIMIT,default=1000"`
	FileSizeLimit           int64         `env:"FILE_SIZE_LIMIT,default=10000000"`
	AWSRegion               string        `env:"AWS_REGION,required"`
	S3BucketIOSImages       string        `env:"S3_BUCKET_IOS_IMAGES,required"`
	TokenSecret             string        `env:"TOKEN_SECRET,required"`
	UAParserFile            string        `env:"UAPARSER_FILE,required"`
	MaxMinDBFile            string        `env:"MAXMINDDB_FILE,required"`
	UseProfiler             bool          `env:"PROFILER_ENABLED,default=false"`
	UseAccessControlHeaders bool          `env:"USE_CORS,default=false"`
	WorkerID                uint16
}

func New() *Config {
	cfg := &Config{WorkerID: env.WorkerID()}
	configurator.Process(cfg)
	return cfg
}
