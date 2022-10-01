package assets

import (
	"openreplay/backend/internal/config/common"
	"openreplay/backend/internal/config/configurator"
)

type Config struct {
	common.Config
	RequestHeaders  		map[string]string 		`env:"REQUEST_HEADERS"`
	CheckResourceMimetype 	bool 			    	`env:"CHECK_RESOURCE_MIMETYPE"`
	IgnoreMimetypesList   	[]string          		`env:"IGNORE_MIMETYPES_LIST"`
}

func New() *Config {
	cfg := &Config{}
	configurator.Process(cfg)
	return cfg
}
