package storage

import (
	"errors"
)

func GenerateEncryptionKey() []byte {
	return nil
}

func EncryptData(data, fullKey []byte) ([]byte, error) {
	return nil, errors.New("not supported")
}

func DecryptData(data, fullKey []byte) ([]byte, error) {
	return nil, errors.New("not supported")
}
