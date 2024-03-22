package s3

import (
	"net/url"
	"os"
)

func tagging(useTags bool) *string {
	if !useTags {
		return nil
	}
	tag := loadFileTag()
	return &tag
}

func loadFileTag() string {
	// Load file tag from env
	key := "retention"
	value := os.Getenv("RETENTION")
	if value == "" {
		value = "default"
	}
	// Create URL encoded tag set for file
	params := url.Values{}
	params.Add(key, value)
	return params.Encode()
}
