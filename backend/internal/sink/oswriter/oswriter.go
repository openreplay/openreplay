package oswriter

import (
	"math"
	"os"
	"strconv"
	"time"
)

type Writer struct {
	ulimit int
	dir    string
	files  map[uint64]*os.File
	atimes map[uint64]int64
}

func NewWriter(ulimit uint16, dir string) *Writer {
	return &Writer{
		ulimit: int(ulimit),
		dir:    dir + "/",
		files:  make(map[uint64]*os.File),
		atimes: make(map[uint64]int64),
	}
}

func (w *Writer) open(key uint64) (*os.File, error) {
	file, ok := w.files[key]
	if ok {
		return file, nil
	}
	if len(w.atimes) == w.ulimit {
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
	file, err := os.OpenFile(w.dir+strconv.FormatUint(key, 10), os.O_WRONLY|os.O_CREATE|os.O_APPEND, 0644)
	if err != nil {
		return nil, err
	}
	w.files[key] = file
	w.atimes[key] = time.Now().Unix()
	return file, nil
}

func (w *Writer) Close(key uint64) error {
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
	return nil
}

func (w *Writer) Write(key uint64, data []byte) error {
	file, err := w.open(key)
	if err != nil {
		return err
	}
	// TODO: add check for the number of recorded bytes to file
	_, err = file.Write(data)
	return err
}

func (w *Writer) SyncAll() error {
	for _, file := range w.files {
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
	w.atimes = nil
	return nil
}
