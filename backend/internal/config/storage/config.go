package storage

import (
	"openreplay/backend/pkg/env"
	"time"
)

type Config struct {
	S3Region             string
	S3Bucket             string
	FSDir                string
	FSCleanHRS           int
	SessionFileSplitSize int
	RetryTimeout         time.Duration
	GroupStorage         string
	TopicTrigger         string
	DeleteTimeout        time.Duration
}

func New() *Config {
	return &Config{
		S3Region:             env.String("AWS_REGION_WEB"),
		S3Bucket:             env.String("S3_BUCKET_WEB"),
		FSDir:                env.String("FS_DIR"),
		FSCleanHRS:           env.Int("FS_CLEAN_HRS"),
		SessionFileSplitSize: 200000, // ~200 kB
		RetryTimeout:         2 * time.Minute,
		GroupStorage:         env.String("GROUP_STORAGE"),
		TopicTrigger:         env.String("TOPIC_TRIGGER"),
		DeleteTimeout:        48 * time.Hour,
	}
}
