package main

import (
	"context"
	"log"
	"net/http"
	"openreplay/backend/pkg/db/postgres"
	"os"
	"os/signal"
	"syscall"

	"golang.org/x/net/http2"

	"openreplay/backend/pkg/db/cache"
	"openreplay/backend/pkg/env"
	"openreplay/backend/pkg/flakeid"
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/queue/types"
	"openreplay/backend/pkg/storage"
	"openreplay/backend/pkg/token"
	"openreplay/backend/pkg/url/assets"
	"openreplay/backend/services/http/geoip"
	"openreplay/backend/services/http/uaparser"

	"openreplay/backend/pkg/pprof"
)

// Global variables
var cfg *config
var rewriter *assets.Rewriter
var producer types.Producer
var pgconn *cache.PGCache
var flaker *flakeid.Flaker
var uaParser *uaparser.UAParser
var geoIP *geoip.GeoIP
var tokenizer *token.Tokenizer
var s3 *storage.S3

func main() {
	log.SetFlags(log.LstdFlags | log.LUTC | log.Llongfile)
	pprof.StartProfilingServer()

	// Configs
	cfg = NewConfig()

	// Queue
	producer = queue.NewProducer()
	defer producer.Close(15000)

	// Database
	pgconn = cache.NewPGCache(postgres.NewConn(env.String("POSTGRES_STRING")), 1000*60*20)
	defer pgconn.Close()

	// Init modules
	rewriter = assets.NewRewriter(cfg.AssetsOrigin)
	s3 = storage.NewS3(cfg.AWSRegion, cfg.S3BucketIOSImages)
	tokenizer = token.NewTokenizer(cfg.TokenSecret)
	uaParser = uaparser.NewUAParser(cfg.UAParserFile)
	geoIP = geoip.NewGeoIP(cfg.MaxMinDBFile)
	flaker = flakeid.NewFlaker(cfg.WorkerID)

	// Server
	server := &http.Server{
		Addr: ":" + cfg.HTTPPort,
		Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

			// TODO: agree with specification
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "POST")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type,Authorization")
			if r.Method == http.MethodOptions {
				w.Header().Set("Cache-Control", "max-age=86400")
				w.WriteHeader(http.StatusOK)
				return
			}

			log.Printf("Request: %v  -  %v  ", r.Method, r.URL.Path)

			switch r.URL.Path {
			case "/":
				w.WriteHeader(http.StatusOK)
			case "/v1/web/not-started":
				switch r.Method {
				case http.MethodPost:
					notStartedHandlerWeb(w, r)
				default:
					w.WriteHeader(http.StatusMethodNotAllowed)
				}
			case "/v1/web/start":
				switch r.Method {
				case http.MethodPost:
					startSessionHandlerWeb(w, r)
				default:
					w.WriteHeader(http.StatusMethodNotAllowed)
				}
			case "/v1/web/i":
				switch r.Method {
				case http.MethodPost:
					pushMessagesHandlerWeb(w, r)
				default:
					w.WriteHeader(http.StatusMethodNotAllowed)
				}
			case "/v1/ios/start":
				switch r.Method {
				case http.MethodPost:
					startSessionHandlerIOS(w, r)
				default:
					w.WriteHeader(http.StatusMethodNotAllowed)
				}
			case "/v1/ios/i":
				switch r.Method {
				case http.MethodPost:
					pushMessagesHandlerIOS(w, r)
				default:
					w.WriteHeader(http.StatusMethodNotAllowed)
				}
			case "/v1/ios/late":
				switch r.Method {
				case http.MethodPost:
					pushLateMessagesHandlerIOS(w, r)
				default:
					w.WriteHeader(http.StatusMethodNotAllowed)
				}
			case "/v1/ios/images":
				switch r.Method {
				case http.MethodPost:
					imagesUploadHandlerIOS(w, r)
				default:
					w.WriteHeader(http.StatusMethodNotAllowed)
				}
			default:
				w.WriteHeader(http.StatusNotFound)
			}
		}),
	}

	http2.ConfigureServer(server, nil)
	go func() {
		if err := server.ListenAndServe(); err != nil {
			log.Printf("Server error: %v\n", err)
			log.Fatal("Server error")
		}
	}()
	log.Printf("Server successfully started on port %v\n", cfg.HTTPPort)

	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)
	<-sigchan
	log.Printf("Shutting down the server\n")
	server.Shutdown(context.Background())
}
