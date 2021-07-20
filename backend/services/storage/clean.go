package main

import (
	"os"
	"log"
	"time"
	"strconv"
	"io/ioutil"

	"openreplay/backend/pkg/flakeid"
)

const DELETE_TIMEOUT = 12 * time.Hour;

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
		if time.Unix(ts/1000, 0).Add(DELETE_TIMEOUT).Before(time.Now()) {
			os.Remove(dirname + "/" + name)
		}
	}
}