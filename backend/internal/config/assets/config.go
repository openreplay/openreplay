package assets

import (
	"openreplay/backend/internal/config/common"
	"openreplay/backend/internal/config/configurator"
)

type Config struct {
	common.Config
	GroupCache           string            `env:"GROUP_CACHE,required"`
	TopicCache           string            `env:"TOPIC_CACHE,required"`
	AWSRegion            string            `env:"AWS_REGION,required"`
	S3BucketAssets       string            `env:"S3_BUCKET_ASSETS,required"`
	AssetsOrigin         string            `env:"ASSETS_ORIGIN,required"`
	AssetsSizeLimit      int               `env:"ASSETS_SIZE_LIMIT,required"`
	AssetsRequestHeaders map[string]string `env:"ASSETS_REQUEST_HEADERS"`
	UseProfiler          bool              `env:"PROFILER_ENABLED,default=false"`
	ClientKeyFilePath    string            `env:"CLIENT_KEY_FILE_PATH"`
	CaCertFilePath       string            `env:"CA_CERT_FILE_PATH"`
	ClientCertFilePath   string            `env:"CLIENT_CERT_FILE_PATH"`
}

func New() *Config {
	cfg := &Config{}
	configurator.Process(cfg)
	return cfg
}
