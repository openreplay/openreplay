package main

import (
	"log"
	"time"
	"os"
	"strconv"

	"os/signal"
	"syscall"

	"openreplay/backend/pkg/env"
	"openreplay/backend/pkg/storage"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/queue/types"
)



func main() {
	log.SetFlags(log.LstdFlags | log.LUTC | log.Llongfile)


	storageWeb := storage.NewS3(env.String("AWS_REGION_WEB"), env.String("S3_BUCKET_WEB"))
	//storageIos := storage.NewS3(env.String("AWS_REGION_IOS"), env.String("S3_BUCKET_IOS"))
	FS_DIR := env.String("FS_DIR")
	FS_CLEAN_HRS := env.Int("FS_CLEAN_HRS")

	var uploadKey func(string, int, *storage.S3)
	uploadKey = func(key string, retryCount int, s *storage.S3) {
		if retryCount <= 0 {
			return;
		}
		file, err := os.Open(FS_DIR + "/" + key)
		defer file.Close()
		if err != nil {
			log.Printf("File error: %v; Will retry %v more time(s)\n", err, retryCount)
			time.AfterFunc(2*time.Minute, func() {
				uploadKey(key, retryCount - 1, s)
			})
		} else {
			if err := s.Upload(gzipFile(file), key, "application/octet-stream", true); err != nil {
				log.Fatalf("Storage upload error: %v\n", err)
			}
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
					uploadKey(strconv.FormatUint(sessionID, 10), 5, storageWeb)
				//case *messages.IOSSessionEnd:
				//	uploadKey(strconv.FormatUint(sessionID, 10), 5, storageIos)
	  	}
	  },
	)

	sigchan := make(chan os.Signal, 1)
  signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)


  cleanTick := time.Tick(time.Duration(FS_CLEAN_HRS) * time.Hour)


  log.Println("Storage: start consuming")
	for {
		select {
		case sig := <-sigchan:
			log.Printf("Caught signal %v: terminating\n", sig)
			consumer.Close()
			os.Exit(0)
		case <-cleanTick:
			cleanDir(FS_DIR)
		default:
			err := consumer.ConsumeNext()
			if err != nil {
				log.Fatalf("Error on consumption: %v", err)
			}
		}
	}
}

