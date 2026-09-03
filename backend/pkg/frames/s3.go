package frames

import (
	"io"
	"os"

	"openreplay/backend/pkg/objectstorage"

	"github.com/klauspost/compress/zstd"
)

func StreamZstdToS3(objStorage objectstorage.ObjectStorage, key, srcPath string) error {
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

		zw, err := zstd.NewWriter(pw, zstd.WithEncoderLevel(zstd.SpeedFastest))
		if err != nil {
			wErr = err
			return
		}
		defer zw.Close()

		_, wErr = io.CopyBuffer(zw, f, make([]byte, 256*1024))
	}()

	if err := objStorage.Upload(pr, key, "application/octet-stream", objectstorage.NoContentEncoding, objectstorage.Zstd); err != nil {
		pr.CloseWithError(err)
		<-errCh
		return err
	}
	return <-errCh
}
