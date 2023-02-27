package common

import "strings"

type Config struct {
	ConfigFilePath   string `env:"CONFIG_FILE_PATH"`
	MessageSizeLimit int    `env:"QUEUE_MESSAGE_SIZE_LIMIT,default=1048576"`
}

type Configer interface {
	GetConfigPath() string
}

func (c *Config) GetConfigPath() string {
	return c.ConfigFilePath
}

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
