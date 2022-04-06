package main

import (
	"io/ioutil"
	"log"
	"os"
	"strconv"
	"time"

	"openreplay/backend/pkg/flakeid"
)

const DELETE_TIMEOUT = 48 * time.Hour

func cleanDir(dirname string) {
	files, err := ioutil.ReadDir(dirname)
	if err != nil {
		log.Printf("Cannot read file directory. %v", err)
		return
	}

	for _, f := range files {
		name := f.Name()
		id, err := strconv.ParseUint(name, 10, 64)
		if err != nil {
			log.Printf("Cannot parse session filename. %v", err)
			continue
		}
		ts := int64(flakeid.ExtractTimestamp(id))
		if time.UnixMilli(ts).Add(DELETE_TIMEOUT).Before(time.Now()) {
			// returns a error. Don't log it sinse it can be race condition between worker instances
			os.Remove(dirname + "/" + name)
		}
	}
}
