package oswriter

import (
	"fmt"
	"math"
	"os"
	"strconv"
	"time"
)

type FileType int

const (
	DOM FileType = 1
	DEV FileType = 2
)

type Writer struct {
	ulimit   int
	dir      string
	files    map[uint64]*os.File
	devtools map[uint64]*os.File
	atimes   map[uint64]int64
}

func NewWriter(ulimit uint16, dir string) *Writer {
	return &Writer{
		ulimit:   int(ulimit),
		dir:      dir + "/",
		files:    make(map[uint64]*os.File, 1024),
		devtools: make(map[uint64]*os.File, 1024),
		atimes:   make(map[uint64]int64, 1024),
	}
}

func (w *Writer) open(key uint64, mode FileType) (*os.File, error) {
	if mode == DOM {
		file, ok := w.files[key]
		if ok {
			return file, nil
		}
	} else {
		file, ok := w.devtools[key]
		if ok {
			return file, nil
		}
	}

	if len(w.atimes) >= w.ulimit {
		var m_k uint64
		var m_t int64 = math.MaxInt64
		for k, t := range w.atimes {
			if t < m_t {
				m_k = k
				m_t = t
			}
		}
		if err := w.Close(m_k); err != nil {
			return nil, err
		}
	}
	filePath := w.dir + strconv.FormatUint(key, 10)
	if mode == DEV {
		filePath += "devtools"
	}
	file, err := os.OpenFile(filePath, os.O_WRONLY|os.O_CREATE|os.O_APPEND, 0644)
	if err != nil {
		return nil, err
	}
	if mode == DOM {
		w.files[key] = file
	} else {
		w.devtools[key] = file
	}
	w.atimes[key] = time.Now().Unix()
	return file, nil
}

func (w *Writer) Close(key uint64) error {
	// Close dom file
	file := w.files[key]
	if file == nil {
		return nil
	}
	if err := file.Sync(); err != nil {
		return err
	}
	if err := file.Close(); err != nil {
		return err
	}
	delete(w.files, key)
	delete(w.atimes, key)
	// Close dev file
	file = w.devtools[key]
	if file == nil {
		return nil
	}
	if err := file.Sync(); err != nil {
		return err
	}
	if err := file.Close(); err != nil {
		return err
	}
	delete(w.devtools, key)
	return nil
}

func (w *Writer) WriteDOM(key uint64, data []byte) error {
	return w.Write(key, DOM, data)
}

func (w *Writer) WriteDEV(key uint64, data []byte) error {
	return w.Write(key, DEV, data)
}

func (w *Writer) Write(key uint64, mode FileType, data []byte) error {
	file, err := w.open(key, mode)
	if err != nil {
		return err
	}
	_, err = file.Write(data)
	return err
}

func (w *Writer) SyncAll() error {
	for _, file := range w.files {
		if err := file.Sync(); err != nil {
			return err
		}
	}
	for _, file := range w.devtools {
		if err := file.Sync(); err != nil {
			return err
		}
	}
	return nil
}

func (w *Writer) CloseAll() error {
	for _, file := range w.files {
		if err := file.Sync(); err != nil {
			return err
		}
		if err := file.Close(); err != nil {
			return err
		}
	}
	w.files = nil
	for _, file := range w.devtools {
		if err := file.Sync(); err != nil {
			return err
		}
		if err := file.Close(); err != nil {
			return err
		}
	}
	w.devtools = nil
	w.atimes = nil
	return nil
}

func (w *Writer) Info() string {
	return fmt.Sprintf("dom: %d, dev: %d", len(w.files), len(w.devtools))
}
