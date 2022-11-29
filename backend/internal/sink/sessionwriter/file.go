package sessionwriter

import (
	"bufio"
	"io"
	"log"
	"os"
)

type File struct {
	file    *os.File
	buffer  *bufio.Writer
	updated bool
}

func NewFile(path string, bufSize int) (*File, error) {
	file, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_APPEND, 0644)
	if err != nil {
		return nil, err
	}
	return &File{
		file:    file,
		buffer:  bufio.NewWriterSize(file, bufSize),
		updated: false,
	}, nil
}

func (f *File) Write(data []byte) error {
	f.updated = true
	if len(data) > f.buffer.Available()+f.buffer.Size() {
		// Flush buffer to file
		for i := 0; i < 3; i++ {
			err := f.buffer.Flush()
			if err == nil {
				break
			}
			log.Printf("can't flush buffer: %s", err)
		}
		// Write big message directly to file
		return f.write(f.file, data)
	}
	return f.write(f.buffer, data)
}

func (f *File) write(w io.Writer, data []byte) error {
	leftToWrite := len(data)
	for leftToWrite > 0 {
		from := len(data) - leftToWrite
		writtenDown, err := w.Write(data[from:])
		if err != nil {
			return err
		}
		leftToWrite -= writtenDown
	}
	return nil
}

func (f *File) Sync() error {
	if !f.updated {
		return nil
	}
	if err := f.buffer.Flush(); err != nil {
		return err
	}
	if err := f.file.Sync(); err != nil {
		return err
	}
	f.updated = false
	return nil
}

func (f *File) Close() error {
	_ = f.buffer.Flush()
	_ = f.file.Sync()
	return f.file.Close()
}
