package config

import (
	"openreplay/backend/pkg/env"
	"time"
)

type Config struct {
	HTTPHost          string
	HTTPPort          string
	HTTPTimeout       time.Duration
	TopicRawWeb       string
	TopicRawIOS       string
	TopicCache        string
	CacheAssets       bool
	BeaconSizeLimit   int64
	JsonSizeLimit     int64
	FileSizeLimit     int64
	AssetsOrigin      string
	AWSRegion         string
	S3BucketIOSImages string
	Postgres          string
	TokenSecret       string
	UAParserFile      string
	MaxMinDBFile      string
	WorkerID          uint16
}

func New() *Config {
	return &Config{
		HTTPHost:          "", // empty by default
		HTTPPort:          env.String("HTTP_PORT"),
		HTTPTimeout:       time.Second * 60,
		TopicRawWeb:       env.String("TOPIC_RAW_WEB"),
		TopicRawIOS:       env.String("TOPIC_RAW_IOS"),
		TopicCache:        env.String("TOPIC_CACHE"),
		CacheAssets:       env.Bool("CACHE_ASSETS"),
		BeaconSizeLimit:   int64(env.Uint64("BEACON_SIZE_LIMIT")),
		JsonSizeLimit:     1e3, // 1Kb
		FileSizeLimit:     1e7, // 10Mb
		AssetsOrigin:      env.String("ASSETS_ORIGIN"),
		AWSRegion:         env.String("AWS_REGION"),
		S3BucketIOSImages: env.String("S3_BUCKET_IOS_IMAGES"),
		Postgres:          env.String("POSTGRES_STRING"),
		TokenSecret:       env.String("TOKEN_SECRET"),
		UAParserFile:      env.String("UAPARSER_FILE"),
		MaxMinDBFile:      env.String("MAXMINDDB_FILE"),
		WorkerID:          env.WorkerID(),
	}
}
