package main

import (
	"log"
	"os"
	"strconv"
	"time"

	"bytes"
	"io"
	//"io/ioutil"

	"os/signal"
	"syscall"

	"openreplay/backend/pkg/env"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/queue/types"
	"openreplay/backend/pkg/storage"
)

const RetryTimeout = 2 * time.Minute

const SESSION_FILE_SPLIT_SIZE = 200000 // ~200 kB

func main() {
	log.SetFlags(log.LstdFlags | log.LUTC | log.Llongfile)

	storage := storage.NewS3(env.String("AWS_REGION_WEB"), env.String("S3_BUCKET_WEB"))
	FS_DIR := env.String("FS_DIR")
	FS_CLEAN_HRS := env.Int("FS_CLEAN_HRS")

	var uploadKey func(string, int)
	uploadKey = func(key string, retryCount int) {
		if retryCount <= 0 {
			return
		}

		file, err := os.Open(FS_DIR + "/" + key)
		if err != nil {
			log.Printf("File error: %v; Will retry %v more time(s)\n", err, retryCount)
			time.AfterFunc(RetryTimeout, func() {
				uploadKey(key, retryCount-1)
			})
			return
		}
		defer file.Close()

		fileR2 := new(bytes.Buffer)
		fileR1 := io.TeeReader(file, fileR2)

		startBytes := make([]byte, SESSION_FILE_SPLIT_SIZE)
		nRead, err := fileR1.Read(startBytes)
		if err != nil {
			log.Printf("File read error: %f", err)
			return
		}
		startReader := bytes.NewBuffer(startBytes)
		if err := storage.Upload(gzipFile(startReader), key+"-s", "application/octet-stream", true); err != nil {
			log.Fatalf("Storage: start upload failed.  %v\n", err)
		}
		if nRead == SESSION_FILE_SPLIT_SIZE {
			if err := storage.Upload(gzipFile(fileR1), key+"-e", "application/octet-stream", true); err != nil {
				log.Fatalf("Storage: end upload failed. %v\n", err)
			}
		}

		if err := storage.Upload(gzipFile(fileR2), key, "application/octet-stream", true); err != nil {
			log.Fatalf("Storage: upload failed.  %v\n", err)
		}
	}

	consumer := queue.NewMessageConsumer(
		env.String("GROUP_STORAGE"),
		[]string{
			env.String("TOPIC_TRIGGER"),
		},
		func(sessionID uint64, msg messages.Message, meta *types.Meta) {
			switch msg.(type) {
			case *messages.SessionEnd:
				uploadKey(strconv.FormatUint(sessionID, 10), 5)
			}
		},
		true,
	)

	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)

	cleanTick := time.Tick(time.Duration(FS_CLEAN_HRS) * time.Hour)

	log.Printf("Storage service started\n")
	for {
		select {
		case sig := <-sigchan:
			log.Printf("Caught signal %v: terminating\n", sig)
			consumer.Close()
			os.Exit(0)
		case <-cleanTick:
			go cleanDir(FS_DIR)
		default:
			err := consumer.ConsumeNext()
			if err != nil {
				log.Fatalf("Error on consumption: %v", err)
			}
		}
	}
}
