package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"


	"openreplay/backend/pkg/env"
	"openreplay/backend/pkg/flakeid"
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/queue/types"
	"openreplay/backend/pkg/storage"
	"openreplay/backend/pkg/db/postgres"
	"openreplay/backend/pkg/db/cache"
	"openreplay/backend/pkg/url/assets"
	"openreplay/backend/pkg/token"
	"openreplay/backend/services/http/geoip"
	"openreplay/backend/services/http/uaparser"

)

var rewriter *assets.Rewriter
var producer types.Producer
var pgconn *cache.PGCache
var flaker *flakeid.Flaker
var uaParser *uaparser.UAParser
var geoIP *geoip.GeoIP
var tokenizer *token.Tokenizer
var s3 *storage.S3
var topicRaw string
var topicTrigger string
var topicAnalytics string
// var kafkaTopicEvents string
var cacheAssets bool

func main() {
	log.SetFlags(log.LstdFlags | log.LUTC | log.Llongfile)

	producer = queue.NewProducer()
	defer producer.Close(15000)
	topicRaw = env.String("TOPIC_RAW")
	topicTrigger = env.String("TOPIC_TRIGGER")
	topicAnalytics = env.String("TOPIC_ANALYTICS")
	rewriter = assets.NewRewriter(env.String("ASSETS_ORIGIN"))
	pgconn = cache.NewPGCache(postgres.NewConn(env.String("POSTGRES_STRING")), 1000 * 60 * 20)
	defer pgconn.Close()
	//s3 = storage.NewS3(env.String("S3_BUCKET_IMAGES_IOS"), env.String("AWS_REGION"))
	tokenizer = token.NewTokenizer(env.String("TOKEN_SECRET"))
	uaParser = uaparser.NewUAParser(env.String("UAPARSER_FILE"))
	geoIP = geoip.NewGeoIP(env.String("MAXMINDDB_FILE"))
	flaker = flakeid.NewFlaker(env.WorkerID())
	cacheAssets = env.Bool("CACHE_ASSETS")

	HTTP_PORT := env.String("HTTP_PORT")

	server := &http.Server{
		Addr: ":" + HTTP_PORT,
		Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

			// TODO: agree with specification
			w.Header().Set("Access-Control-Allow-Origin", "*") 
			w.Header().Set("Access-Control-Allow-Methods", "POST")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type,Authorization")
			if r.Method == http.MethodOptions {
				//w.Header().Set("Cache-Control", "max-age=86400")
				w.WriteHeader(http.StatusOK)
				return
			}

			switch r.URL.Path {
			case "/":
				w.WriteHeader(http.StatusOK)
			case "/v1/web/not-started": 
				switch r.Method {
				case http.MethodPost:
					notStartedHandler(w, r)
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
					pushMessagesSeparatelyHandler(w, r)
				default:
					w.WriteHeader(http.StatusMethodNotAllowed)
				}
			// case "/v1/ios/start":
			// 	switch r.Method {
			// 	case http.MethodPost:
			// 		startSessionHandlerIOS(w, r)
			// 	default:
			// 		w.WriteHeader(http.StatusMethodNotAllowed)
			// 	}
			// case "/v1/ios/append":
			// 	switch r.Method {
			// 	case http.MethodPost:
			// 		pushMessagesHandler(w, r)
			// 	default:
			// 		w.WriteHeader(http.StatusMethodNotAllowed)
			// 	}
			// case "/v1/ios/late":
			// 	switch r.Method {
			// 	case http.MethodPost:
			// 		pushLateMessagesHandler(w, r)
			// 	default:
			// 		w.WriteHeader(http.StatusMethodNotAllowed)
			// 	}
			// case "/v1/ios/images":
			// 	switch r.Method {
			// 	case http.MethodPost:
			// 		iosImagesUploadHandler(w, r)
			// 	default:
			// 		w.WriteHeader(http.StatusMethodNotAllowed)
			// 	}
			default:
				w.WriteHeader(http.StatusNotFound)
			}
		}),
	}
	go func() {
		if err := server.ListenAndServe(); err != nil {
			log.Fatalf("Server error: %v\n", err)
		}
	}()
	log.Printf("Server successfully started on port %v\n", HTTP_PORT)
	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)
	<-sigchan
	log.Printf("Shutting down the server\n")
	server.Shutdown(context.Background())
}
