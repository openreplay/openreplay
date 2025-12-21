package pprof

import (
	"log"
	"net/http"
	_ "net/http/pprof"
)

func StartProfilingServer() {
	go func() {
		log.Println(http.ListenAndServe(":6060", nil))
	}()
}
