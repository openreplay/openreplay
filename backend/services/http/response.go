package main

import (
	"encoding/json"
	"log"
	"net/http"
)

func responseWithJSON(w http.ResponseWriter, res interface{}) {
	body, err := json.Marshal(res)
	if err != nil {
		log.Println(err)
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write(body)
}

func responseWithError(w http.ResponseWriter, code int, err error) {
	type response struct {
		Error string `json:"error"`
	}
	w.WriteHeader(code)
	responseWithJSON(w, &response{err.Error()})
}
