package common

import "strings"

// Common config for all services

type Config struct {
	ConfigFilePath   string `env:"CONFIG_FILE_PATH"`
	MessageSizeLimit int    `env:"QUEUE_MESSAGE_SIZE_LIMIT,default=1048576"`
	MaxMemoryUsage   uint64 `env:"MAX_MEMORY_USAGE,default=80"`
	MemoryLimitMB    uint64 `env:"MEMORY_LIMIT_MB,default=0"` // 0 means take limit from OS (cgroup)
}

type Configer interface {
	GetConfigPath() string
}

func (c *Config) GetConfigPath() string {
	return c.ConfigFilePath
}

// Postgres config

type Postgres struct {
	Postgres        string `env:"POSTGRES_STRING,required"`
	ApplicationName string `env:"SERVICE_NAME,default='worker'"`
}

func (cfg *Postgres) String() string {
	str := cfg.Postgres
	if !strings.Contains(cfg.Postgres, "application_name") {
		if strings.Contains(cfg.Postgres, "?") {
			str += "&"
		} else {
			str += "?"
		}
		str += "application_name=" + cfg.ApplicationName
	}
	return str
}

// Redshift config

type Redshift struct {
	ConnectionString string `env:"REDSHIFT_STRING"`
	Host             string `env:"REDSHIFT_HOST"`
	Port             int    `env:"REDSHIFT_PORT"`
	User             string `env:"REDSHIFT_USER"`
	Password         string `env:"REDSHIFT_PASSWORD"`
	Database         string `env:"REDSHIFT_DATABASE"`
	Bucket           string `env:"REDSHIFT_BUCKET,default=rdshftbucket"`
}

// Clickhouse config

type Clickhouse struct {
	URL      string `env:"CLICKHOUSE_STRING"`
	Database string `env:"CLICKHOUSE_DATABASE,default=default"`
	UserName string `env:"CLICKHOUSE_USERNAME,default=default"`
	Password string `env:"CLICKHOUSE_PASSWORD,default="`
}

// ElasticSearch config

type ElasticSearch struct {
	URLs     string `env:"ELASTICSEARCH_URLS"`
	UseAWS   bool   `env:"ELASTICSEARCH_IN_AWS,default=false"`
	User     string `env:"ELASTICSEARCH_USER"`
	Password string `env:"ELASTICSEARCH_PASSWORD"`
}

func (cfg *ElasticSearch) GetURLs() []string {
	return strings.Split(cfg.URLs, ",")
}
