package router

import (
	"encoding/json"
	"log"
	"net/http"
)

func ResponseWithJSON(w http.ResponseWriter, res interface{}) {
	body, err := json.Marshal(res)
	if err != nil {
		log.Println(err)
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write(body)
}

func ResponseWithError(w http.ResponseWriter, code int, err error) {
	type response struct {
		Error string `json:"error"`
	}
	w.WriteHeader(code)
	ResponseWithJSON(w, &response{err.Error()})
}
