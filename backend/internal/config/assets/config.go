package assets

import (
	"openreplay/backend/internal/config/common"
	"openreplay/backend/internal/config/configurator"
	"openreplay/backend/internal/config/objectstorage"
)

type Config struct {
	common.Config
	objectstorage.ObjectsConfig
	GroupCache           string            `env:"GROUP_CACHE,required"`
	TopicCache           string            `env:"TOPIC_CACHE,required"`
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
