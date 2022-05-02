package main

import (
	"io"
	"io/ioutil"
	"log"
	"net/http"

	gzip "github.com/klauspost/pgzip"
)

func (e *Router) pushMessages(w http.ResponseWriter, r *http.Request, sessionID uint64, topicName string) {
	body := http.MaxBytesReader(w, r.Body, e.cfg.BeaconSizeLimit)
	defer body.Close()
	var reader io.ReadCloser
	var err error
	switch r.Header.Get("Content-Encoding") {
	case "gzip":
		log.Println("Gzip", reader)

		reader, err = gzip.NewReader(body)
		if err != nil {
			responseWithError(w, http.StatusInternalServerError, err) // TODO: stage-dependent responce
			return
		}
		log.Println("Gzip reader init", reader)
		defer reader.Close()
	default:
		reader = body
	}
	log.Println("Reader after switch:", reader)
	buf, err := ioutil.ReadAll(reader)
	if err != nil {
		responseWithError(w, http.StatusInternalServerError, err) // TODO: send error here only on staging
		return
	}
	e.services.producer.Produce(topicName, sessionID, buf) // What if not able to send?
	w.WriteHeader(http.StatusOK)
}
