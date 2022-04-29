package main

import "openreplay/backend/pkg/env"

type config struct {
	HTTPPort          string
	TopicRawWeb       string
	TopicRawIOS       string
	TopicCache        string
	CacheAssets       bool
	BeaconSizeLimit   int64
	JsonSizeLimit     int64
	AssetsOrigin      string
	AWSRegion         string
	S3BucketIOSImages string
	TokenSecret       string
	UAParserFile      string
	MaxMinDBFile      string
	WorkerID          uint16
}

func NewConfig() *config {
	return &config{
		HTTPPort:          env.String("HTTP_PORT"),
		TopicRawWeb:       env.String("TOPIC_RAW_WEB"),
		TopicRawIOS:       env.String("TOPIC_RAW_IOS"),
		TopicCache:        env.String("TOPIC_CACHE"),
		CacheAssets:       env.Bool("CACHE_ASSETS"),
		BeaconSizeLimit:   int64(env.Uint64("BEACON_SIZE_LIMIT")),
		JsonSizeLimit:     1e3, // 1Kb
		AssetsOrigin:      env.String("ASSETS_ORIGIN"),
		AWSRegion:         env.String("AWS_REGION"),
		S3BucketIOSImages: env.String("S3_BUCKET_IOS_IMAGES"),
		TokenSecret:       env.String("TOKEN_SECRET"),
		UAParserFile:      env.String("UAPARSER_FILE"),
		MaxMinDBFile:      env.String("MAXMINDDB_FILE"),
		WorkerID:          env.WorkerID(),
	}
}
