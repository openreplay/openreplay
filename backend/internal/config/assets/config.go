package assets

import (
	"context"

	"openreplay/backend/internal/config/common"
	"openreplay/backend/internal/config/configurator"
	"openreplay/backend/internal/config/objectstorage"
	"openreplay/backend/internal/config/redis"
	"openreplay/backend/pkg/logger"
	urlassets "openreplay/backend/pkg/url/assets"
)

type Cache struct {
	TopicCache      string `env:"TOPIC_CACHE,required"`
	CacheAssets     bool   `env:"CACHE_ASSETS,required"`
	CacheThreshold  int64  `env:"CACHE_THRESHOLD,default=5"`
	CacheExpiration int64  `env:"CACHE_EXPIRATION,default=120"`
	CacheBlackList  string `env:"CACHE_BLACK_LIST,default="`
	KeyScheme       string `env:"ASSETS_KEY_SCHEME,default=daily"` // "hash" for a .<hash> suffix
}

type Config struct {
	common.Config
	objectstorage.ObjectsConfig
	Cache
	redis.Redis
	GroupCache           string            `env:"GROUP_CACHE,required"`
	TopicRawAssets       string            `env:"TOPIC_RAW_ASSETS,required"`
	TopicRawWeb          string            `env:"TOPIC_RAW_WEB,required"`
	AssetsOrigin         string            `env:"ASSETS_ORIGIN,required"`
	AssetsSizeLimit      int               `env:"ASSETS_SIZE_LIMIT,required"`
	AssetsRequestHeaders map[string]string `env:"ASSETS_REQUEST_HEADERS"`
	AssetsCompression    string            `env:"ASSETS_COMPRESSION,default=none"` // none|gzip
	AssetsRetries        int               `env:"ASSETS_RETRIES,default=5"`
	AssetsRetryBaseMs    int               `env:"ASSETS_RETRY_BASE_MS,default=2000"`
	AssetsRetryMaxMs     int               `env:"ASSETS_RETRY_MAX_MS,default=60000"`
	AssetsRetryAfterCap  int               `env:"ASSETS_RETRY_AFTER_CAP_MS,default=60000"`
	AssetsRetryHeapLimit int               `env:"ASSETS_RETRY_HEAP_LIMIT,default=100000"`
	AssetsFailureSuppMin int               `env:"ASSETS_FAILURE_SUPPRESS_MIN,default=60"`
	AssetsPerHostLimit   int               `env:"ASSETS_PER_HOST_LIMIT,default=8"`
	AssetsWorkerCount    int               `env:"ASSETS_WORKER_COUNT,default=64"`
	AssetsHTTPTimeout    int               `env:"ASSETS_HTTP_TIMEOUT,default=6"` // seconds
	AssetsQueueSize      int               `env:"ASSETS_QUEUE_SIZE,default=128"`
	InsecureSkipVerify   bool              `env:"INSECURE_SKIP_VERIFY,default=true"`
	ProducerCloseTimeout int               `env:"PRODUCER_CLOSE_TIMEOUT,default=15000"`
	UseProfiler          bool              `env:"PROFILER_ENABLED,default=false"`
	ClientKeyFilePath    string            `env:"CLIENT_KEY_FILE_PATH"`
	CaCertFilePath       string            `env:"CA_CERT_FILE_PATH"`
	ClientCertFilePath   string            `env:"CLIENT_CERT_FILE_PATH"`
}

const (
	CompressionNone = "none"
	CompressionGzip = "gzip"
)

func New(log logger.Logger) *Config {
	cfg := &Config{}
	configurator.Process(log, cfg)
	cfg.Cache.Validate(log)
	if cfg.AssetsCompression != CompressionNone && cfg.AssetsCompression != CompressionGzip {
		log.Fatal(context.Background(), "invalid ASSETS_COMPRESSION %q (expected %q or %q)",
			cfg.AssetsCompression, CompressionNone, CompressionGzip)
	}
	return cfg
}

func (c *Cache) Validate(log logger.Logger) {
	if !urlassets.ValidKeyScheme(c.KeyScheme) {
		log.Fatal(context.Background(), "invalid ASSETS_KEY_SCHEME %q (expected %q or %q)",
			c.KeyScheme, urlassets.KeySchemeDaily, urlassets.KeySchemeHash)
	}
}
