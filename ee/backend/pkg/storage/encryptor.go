package storage

import (
	"crypto/aes"
	"crypto/cipher"
	crand "crypto/rand"
	"fmt"
	"io"
	"os"

	"openreplay/backend/pkg/objectstorage"
)

// keyLen is the AES-256 key size in bytes.
const keyLen = 32

func GenerateEncryptionKey() []byte {
	key := make([]byte, keyLen)
	crand.Read(key)
	return key
}

func (u *uploaderImpl) streamEncryptionToS3(name, key, srcPath string) error {
	keyBytes := []byte(key)
	if len(keyBytes) != keyLen {
		return fmt.Errorf("invalid encryption key length: %d, expected %d", len(keyBytes), keyLen)
	}
	block, err := aes.NewCipher(keyBytes)
	if err != nil {
		return fmt.Errorf("failed to create AES cipher: %s", err)
	}

	pr, pw := io.Pipe()
	errCh := make(chan error, 1)

	go func() {
		var wErr error
		defer func() {
			if wErr != nil {
				pw.CloseWithError(wErr)
			} else {
				pw.Close()
			}
			errCh <- wErr
		}()

		f, err := os.Open(srcPath)
		if err != nil {
			wErr = err
			return
		}
		defer f.Close()

		iv := make([]byte, block.BlockSize())
		if _, err := crand.Read(iv); err != nil {
			wErr = fmt.Errorf("failed to generate IV: %s", err)
			return
		}
		if _, err := pw.Write(iv); err != nil {
			wErr = err
			return
		}

		stream := cipher.NewCTR(block, iv)
		w := cipher.StreamWriter{S: stream, W: pw}
		_, wErr = io.CopyBuffer(w, f, make([]byte, 256*1024))
	}()

	if err := u.objStorage.Upload(pr, name, "application/octet-stream", objectstorage.NoContentEncoding, objectstorage.NoCompression); err != nil {
		pr.CloseWithError(err)
		<-errCh
		return err
	}
	return <-errCh
}
