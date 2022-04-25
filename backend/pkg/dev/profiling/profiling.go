package profiling

import (
	"github.com/gorilla/mux"
	"log"
	"net/http"
	_ "net/http/pprof"
)

func Profile() {
	go func() {
		router := mux.NewRouter()
		router.PathPrefix("/debug/pprof/").Handler(http.DefaultServeMux)
		log.Println("Starting profiler...")
		if err := http.ListenAndServe(":6060", router); err != nil {
			panic(err)
		}
	}()
}

/*

docker run -p 6060:6060 -e REQUIRED_ENV=http://value  -e ANOTHER_ENV=anothervalue workername

THEN
go tool pprof http://localhost:6060/debug/pprof/heap
OR
go tool pprof http://localhost:6060/debug/pprof/profile?seconds=30

(Look up https://golang.org/pkg/net/http/pprof/)


THEN
https://www.speedscope.app/

*/
