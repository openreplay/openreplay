package router

import (
	gzip "github.com/klauspost/pgzip"
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"time"
)

func (e *Router) pushMessages(w http.ResponseWriter, r *http.Request, sessionID uint64, topicName string) {
	start := time.Now()
	body := http.MaxBytesReader(w, r.Body, e.cfg.BeaconSizeLimit)
	defer body.Close()

	var reader io.ReadCloser
	var err error

	switch r.Header.Get("Content-Encoding") {
	case "gzip":
		log.Println("Gzip", reader)

		reader, err = gzip.NewReader(body)
		if err != nil {
			ResponseWithError(w, http.StatusInternalServerError, err, start, r.URL.Path, 0) // TODO: stage-dependent response
			return
		}
		//log.Println("Gzip reader init", reader)
		defer reader.Close()
	default:
		reader = body
	}
	//log.Println("Reader after switch:", reader)
	buf, err := ioutil.ReadAll(reader)
	if err != nil {
		ResponseWithError(w, http.StatusInternalServerError, err, start, r.URL.Path, 0) // TODO: send error here only on staging
		return
	}
	e.services.Producer.Produce(topicName, sessionID, buf) // What if not able to send?
	w.WriteHeader(http.StatusOK)
}
