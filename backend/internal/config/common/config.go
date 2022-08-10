package common

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
