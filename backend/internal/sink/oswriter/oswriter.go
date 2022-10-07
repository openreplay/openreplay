package oswriter

import (
	"math"
	"os"
	"path/filepath"
	"strconv"
	"time"
)

type Writer struct {
	ulimit int
	dir    string
	files  map[string]*os.File
	atimes map[string]int64
}

func NewWriter(ulimit uint16, dir string) *Writer {
	return &Writer{
		ulimit: int(ulimit),
		dir:    dir + "/",
		files:  make(map[string]*os.File),
		atimes: make(map[string]int64),
	}
}

func (w *Writer) open(fname string) (*os.File, error) {
	file, ok := w.files[fname]
	if ok {
		return file, nil
	}
	if len(w.atimes) == w.ulimit {
		var m_k string
		var m_t int64 = math.MaxInt64
		for k, t := range w.atimes {
			if t < m_t {
				m_k = k
				m_t = t
			}
		}
		if err := w.close(m_k); err != nil {
			return nil, err
		}
	}

	// mkdir if not exist
	pathTo := w.dir + filepath.Dir(fname)
	if _, err := os.Stat(pathTo); os.IsNotExist(err) {
		os.MkdirAll(pathTo, 0644)
	}

	file, err := os.OpenFile(w.dir+fname, os.O_WRONLY|os.O_CREATE|os.O_APPEND, 0644)
	if err != nil {
		return nil, err
	}
	w.files[fname] = file
	w.atimes[fname] = time.Now().Unix()
	return file, nil
}

func (w *Writer) close(fname string) error {
	file := w.files[fname]
	if file == nil {
		return nil
	}
	if err := file.Sync(); err != nil {
		return err
	}
	if err := file.Close(); err != nil {
		return err
	}
	delete(w.files, fname)
	delete(w.atimes, fname)
	return nil
}

func (w *Writer) WriteDOM(sid uint64, data []byte) error {
	return w.write(strconv.FormatUint(sid, 10)+"/dom.mob", data)
}

func (w *Writer) WriteDEV(sid uint64, data []byte) error {
	return w.write(strconv.FormatUint(sid, 10)+"/devtools.mob", data)
}

func (w *Writer) write(fname string, data []byte) error {
	file, err := w.open(fname)
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
