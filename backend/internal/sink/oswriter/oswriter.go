package oswriter

import (
	"errors"
	"fmt"
	"log"
	"math"
	"os"
	"strconv"
	"time"
)

const (
	DOM string = "dom.mob"
	DEV string = "devtools.mob"
	OLD string = ""
)

type Writer struct {
	ulimit   int
	dir      string
	newPath  map[uint64]bool
	files    map[uint64]*os.File // for old mob files and new dom.mob files
	devtools map[uint64]*os.File // for devtools.mob files
	atimes   map[uint64]int64
}

func NewWriter(ulimit uint16, dir string) *Writer {
	return &Writer{
		ulimit:   int(ulimit),
		dir:      dir + "/",
		newPath:  make(map[uint64]bool, 1000),
		files:    make(map[uint64]*os.File, 1000),
		devtools: make(map[uint64]*os.File, 1000),
		atimes:   make(map[uint64]int64),
	}
}

func (w *Writer) WriteDOM(sid uint64, data []byte) error {
	return w.write(sid, DOM, data)
}

func (w *Writer) WriteDEV(sid uint64, data []byte) error {
	return w.write(sid, DEV, data)
}

func (w *Writer) WriteMOB(sid uint64, data []byte) error {
	return w.write(sid, OLD, data)
}

func (w *Writer) open(sess uint64, fname string) (*os.File, error) {
	// Return file descriptor, if we already have it in memory
	if fname == DEV {
		// for devtools mob files
		if file, ok := w.devtools[sess]; ok && file != nil {
			return file, nil
		}
	} else {
		// for common and dom mob files
		if file, ok := w.files[sess]; ok && file != nil {
			if (fname == OLD && !w.newPath[sess]) || (fname == DOM && w.newPath[sess]) {
				return file, nil
			}
			return nil, errors.New("not a directory (type conflict)")
		}
	}

	// Close oldest file descriptor, if we reached the limit
	if len(w.atimes) >= w.ulimit {
		var m_k uint64
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

	// Create folder if not exist
	pathTo := w.dir + strconv.FormatUint(sess, 10)
	if info, err := os.Stat(pathTo); os.IsNotExist(err) {
		if err := os.MkdirAll(pathTo, 0755); err != nil {
			log.Printf("os.MkdirAll error: %s", err)
		}
	} else {
		// File system error
		if err != nil {
			return nil, err
		}
		// Already have the file by old path
		if !info.IsDir() && fname != OLD {
			return nil, errors.New("not a directory")
		}
	}

	// Prepare file path
	var (
		file     *os.File
		err      error
		fileName string
	)

	switch fname {
	case DOM, DEV:
		fileName = pathTo + "/" + fname
	case OLD:
		fileName = pathTo
	default:
		return nil, fmt.Errorf("unknown file name: %s", fname)
	}

	// Open/create file
	file, err = os.OpenFile(fileName, os.O_WRONLY|os.O_CREATE|os.O_APPEND, 0644)
	if err != nil {
		log.Printf("os.OpenFile error: %s", err)
		return nil, err
	}

	// Save file descriptor in memory
	if fname == DEV {
		w.devtools[sess] = file
	} else {
		w.files[sess] = file
	}
	w.atimes[sess] = time.Now().Unix()
	if fname == OLD {
		w.newPath[sess] = false
	} else {
		w.newPath[sess] = true // new path for file
	}
	return file, nil
}

func (w *Writer) write(sess uint64, fname string, data []byte) error {
	file, err := w.open(sess, fname)
	if err != nil {
		return err
	}
	_, err = file.Write(data)
	return err
}

func (w *Writer) close(sess uint64) error {
	// Sync and close dom/common mob file
	if file := w.files[sess]; file != nil {
		if err := file.Sync(); err != nil {
			return err
		}
		if err := file.Close(); err != nil {
			return err
		}
		delete(w.files, sess)
	}
	// Sync and close devtools file
	if file := w.devtools[sess]; file != nil {
		if err := file.Sync(); err != nil {
			return err
		}
		if err := file.Close(); err != nil {
			return err
		}
		delete(w.devtools, sess)
	}
	// Delete file timestamp
	delete(w.atimes, sess)
	delete(w.newPath, sess)
	return nil
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
	for _, file := range w.devtools {
		if err := file.Sync(); err != nil {
			return err
		}
		if err := file.Close(); err != nil {
			return err
		}
	}
	w.files = nil
	w.atimes = nil
	w.newPath = nil
	return nil
}
