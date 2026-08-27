package storage

import (
	"errors"
)

func GenerateEncryptionKey() []byte {
	return nil
}

func (u *uploaderImpl) streamEncryptionToS3(name, key, srcPath string) (int64, error) {
	return 0, errors.New("not implemented")
}
