package recorder

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"sync"
	"time"
)

type recorderImpl struct {
	sessions    map[uint64]*sync.Mutex
	sessionsDir string
}

func (r *recorderImpl) SaveRequest(sessionID uint64, req *http.Request, body []byte) error {
	pwd, _ := os.Getwd()
	log.Printf("new request, pwd: %s", pwd)
	// Hold mutex for session
	if _, ok := r.sessions[sessionID]; !ok {
		r.sessions[sessionID] = &sync.Mutex{}
	}
	r.sessions[sessionID].Lock()
	// Release mutex for session on exit
	defer r.sessions[sessionID].Unlock()

	// Open file
	file, err := os.OpenFile(r.sessionsDir+strconv.FormatUint(sessionID, 10), os.O_WRONLY|os.O_CREATE|os.O_APPEND, 0644)
	if err != nil {
		return err
	}
	// Close file on exit
	defer file.Close()
	log.Printf("file name: %s", strconv.FormatUint(sessionID, 10))

	// Save request info
	/*
		Record format:
		- timestamp
		- method
		- url
		- headers
		- body
	*/
	if _, err := file.Write([]byte("<request>\n")); err != nil {
		log.Printf("can't write data to file: %s", err)
	}
	if _, err := file.Write([]byte(fmt.Sprintf("<ts>%d</ts>\n", time.Now().UnixMilli()))); err != nil {
		log.Printf("can't write timestamp to file: %s", err)
	}
	if _, err := file.Write([]byte(fmt.Sprintf("<method>%s</method>\n", req.Method))); err != nil {
		log.Printf("can't write method to file: %s", err)
	}
	if _, err := file.Write([]byte(fmt.Sprintf("<url>%s</url>\n", req.URL.Path))); err != nil {
		log.Printf("can't write url to file: %s", err)
	}
	reqHeaders, err := json.Marshal(req.Header)
	if err == nil {
		if _, err := file.Write([]byte(fmt.Sprintf("<headers>%s</headers>\n", string(reqHeaders)))); err != nil {
			log.Printf("can't write headers to file: %s", err)
		}
	} else {
		log.Printf("can't marshal request headers: %s", err)
	}
	if _, err := file.Write([]byte(fmt.Sprintf("<body>%s</body>\n", string(body)))); err != nil {
		log.Printf("can't write body to file: %s", err)
	}
	if _, err := file.Write([]byte("</request>\n")); err != nil {
		log.Printf("can't write data to file: %s", err)
	}

	// Sync file changes
	if err := file.Sync(); err != nil {
		log.Printf("can't sync file: %s", err)
	}
	return nil
}

type Recorder interface {
	SaveRequest(sessionID uint64, req *http.Request, body []byte) error
}

func New(dir string) Recorder {
	if dir == "" {
		dir = "./"
	}
	return &recorderImpl{
		sessions:    make(map[uint64]*sync.Mutex),
		sessionsDir: dir,
	}
}
