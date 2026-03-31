package storage

import (
	"errors"
)

func GenerateEncryptionKey() []byte {
	return nil
}

func (u *uploaderImpl) streamEncryptionToS3(name, key, srcPath string) error {
	return errors.New("not implemented")
}
