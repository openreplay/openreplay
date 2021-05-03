package main

import (
	"io"
	gzip "github.com/klauspost/pgzip"
)


func gzipFile(file io.ReadSeeker) io.Reader {
	reader, writer := io.Pipe()
  go func() {
	    gw, _ := gzip.NewWriterLevel(writer, gzip.BestSpeed)	    
	    io.Copy(gw, file)

      gw.Close()
      writer.Close()
  }()
  return reader
}