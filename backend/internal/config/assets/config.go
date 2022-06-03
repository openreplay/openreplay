package assets

import "openreplay/backend/pkg/env"

type Config struct {
	GroupCache      string
	TopicCache      string
	AWSRegion       string
	S3BucketAssets  string
	AssetsOrigin    string
	AssetsSizeLimit int
}

func New() *Config {
	return &Config{
		GroupCache:      env.String("GROUP_CACHE"),
		TopicCache:      env.String("TOPIC_CACHE"),
		AWSRegion:       env.String("AWS_REGION"),
		S3BucketAssets:  env.String("S3_BUCKET_ASSETS"),
		AssetsOrigin:    env.String("ASSETS_ORIGIN"),
		AssetsSizeLimit: env.Int("ASSETS_SIZE_LIMIT"),
	}
}
