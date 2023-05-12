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
