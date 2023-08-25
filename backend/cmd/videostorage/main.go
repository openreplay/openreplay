package main

import (
	"archive/tar"
	"bytes"
	gzip "github.com/klauspost/pgzip"
	"io"
	"log"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	config "openreplay/backend/internal/config/videostorage"
	"openreplay/backend/internal/videostorage"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/metrics"
	storageMetrics "openreplay/backend/pkg/metrics/videostorage"
	"openreplay/backend/pkg/objectstorage/store"
	"openreplay/backend/pkg/queue"
)

func main() {
	m := metrics.New()
	m.Register(storageMetrics.List())

	log.SetFlags(log.LstdFlags | log.LUTC | log.Llongfile)

	cfg := config.New()

	objStore, err := store.NewStore(&cfg.ObjectsConfig)
	if err != nil {
		log.Fatalf("can't init object storage: %s", err)
	}
	srv, err := videostorage.New(cfg, objStore)
	if err != nil {
		log.Printf("can't init storage service: %s", err)
		return
	}

	workDir := cfg.FSDir

	ExtractTarGz := func(gzipStream io.Reader, sessID uint64) {
		uncompressedStream, err := gzip.NewReader(gzipStream)
		if err != nil {
			log.Fatal("ExtractTarGz: NewReader failed")
		}

		tarReader := tar.NewReader(uncompressedStream)

		for true {
			header, err := tarReader.Next()

			if err == io.EOF {
				break
			}

			if err != nil {
				log.Fatalf("ExtractTarGz: Next() failed: %s", err.Error())
			}

			dir := workDir + "/screenshots/" + strconv.FormatUint(sessID, 10) + "/"

			// Ensure the directory exists
			err = os.MkdirAll(dir, 0755)
			if err != nil {
				log.Fatalf("Error creating directories: %v", err)
			}

			if header.Typeflag == tar.TypeReg {
				filePath := dir + header.Name
				outFile, err := os.Create(filePath) // or open file in rewrite mode
				if err != nil {
					log.Fatalf("ExtractTarGz: Create() failed: %s", err.Error())
				}
				if _, err := io.Copy(outFile, tarReader); err != nil {
					log.Fatalf("ExtractTarGz: Copy() failed: %s", err.Error())
				}
				outFile.Close()
			} else {
				log.Printf(
					"ExtractTarGz: uknown type: %d in %s",
					header.Typeflag,
					header.Name)
			}
		}
	}

	imageConsumer := queue.NewConsumer(
		cfg.GroupImageStorage,
		[]string{
			cfg.TopicRawImages,
		},
		messages.NewImagesMessageIterator(func(data []byte, sessID uint64) {
			log.Printf("image data: %d from session: %d", len(data), sessID)
			// Try to extract an archive
			ExtractTarGz(bytes.NewReader(data), sessID)
		}, nil, true),
		false,
		cfg.MessageSizeLimit,
	)

	consumer := queue.NewConsumer(
		cfg.GroupVideoStorage,
		[]string{
			cfg.TopicMobileTrigger,
		},
		messages.NewMessageIterator(
			func(msg messages.Message) {
				sesEnd := msg.(*messages.IOSSessionEnd)
				log.Printf("recieved mobile session end: %d", sesEnd.SessionID())
				if err := srv.Process(sesEnd.SessionID(), workDir+"/screenshots/"+strconv.FormatUint(sesEnd.SessionID(), 10)+"/"); err != nil {
					log.Printf("upload session err: %s, sessID: %d", err, msg.SessionID())
				}
			},
			[]int{messages.MsgSessionEnd},
			true,
		),
		false,
		cfg.MessageSizeLimit,
	)

	log.Printf("Video storage service started\n")

	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)

	counterTick := time.Tick(time.Second * 30)
	for {
		select {
		case sig := <-sigchan:
			log.Printf("Caught signal %v: terminating\n", sig)
			srv.Wait()
			consumer.Close()
			imageConsumer.Close()
			os.Exit(0)
		case <-counterTick:
			srv.Wait()
			if err := consumer.Commit(); err != nil {
				log.Printf("can't commit messages: %s", err)
			}
			if err := imageConsumer.Commit(); err != nil {
				log.Printf("can't commit messages: %s", err)
			}
		case msg := <-consumer.Rebalanced():
			log.Println(msg)
		default:
			err := imageConsumer.ConsumeNext()
			if err != nil {
				log.Fatalf("Error on images consumption: %v", err)
			}
			err = consumer.ConsumeNext()
			if err != nil {
				log.Fatalf("Error on end event consumption: %v", err)
			}
		}
	}
}
