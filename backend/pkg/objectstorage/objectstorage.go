package objectstorage

import (
	"io"
	"time"
)

type CompressionType int

const (
	NoCompression CompressionType = iota
	Gzip
	Brotli
)

type ObjectStorage interface {
	Upload(reader io.Reader, key string, contentType string, compression CompressionType) error
	Get(key string) (io.ReadCloser, error)
	Exists(key string) bool
	GetCreationTime(key string) *time.Time
}
