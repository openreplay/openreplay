package storage

import (
	gzip "github.com/klauspost/pgzip"
	"io"
)

func (s *Storage) gzipFile(file io.Reader) io.Reader {
	reader, writer := io.Pipe()
	go func() {
		gw, _ := gzip.NewWriterLevel(writer, gzip.BestSpeed)
		io.Copy(gw, file)

		gw.Close()
		writer.Close()
	}()
	return reader
}
