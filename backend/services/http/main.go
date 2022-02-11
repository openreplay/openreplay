package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"golang.org/x/net/http2"


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

var TOPIC_RAW_WEB string
var TOPIC_RAW_IOS string
var TOPIC_CACHE string
var TOPIC_TRIGGER string
//var TOPIC_ANALYTICS string
var CACHE_ASSESTS bool
var BEACON_SIZE_LIMIT int64

func main() {
	log.SetFlags(log.LstdFlags | log.LUTC | log.Llongfile)

	producer = queue.NewProducer()
	defer producer.Close(15000)
	TOPIC_RAW_WEB = env.String("TOPIC_RAW_WEB")
	TOPIC_RAW_IOS = env.String("TOPIC_RAW_IOS")
	TOPIC_CACHE = env.String("TOPIC_CACHE")
	TOPIC_TRIGGER = env.String("TOPIC_TRIGGER")
	//TOPIC_ANALYTICS = env.String("TOPIC_ANALYTICS")
	rewriter = assets.NewRewriter(env.String("ASSETS_ORIGIN"))
	pgconn = cache.NewPGCache(postgres.NewConn(env.String("POSTGRES_STRING")), 1000 * 60 * 20)
	defer pgconn.Close()
	s3 = storage.NewS3(env.String("AWS_REGION"), env.String("S3_BUCKET_IOS_IMAGES"))
	tokenizer = token.NewTokenizer(env.String("TOKEN_SECRET"))
	uaParser = uaparser.NewUAParser(env.String("UAPARSER_FILE"))
	geoIP = geoip.NewGeoIP(env.String("MAXMINDDB_FILE"))
	flaker = flakeid.NewFlaker(env.WorkerID())
	CACHE_ASSESTS = env.Bool("CACHE_ASSETS")
	BEACON_SIZE_LIMIT = int64(env.Uint64("BEACON_SIZE_LIMIT"))

	HTTP_PORT := env.String("HTTP_PORT")

	server := &http.Server{
		Addr: ":" + HTTP_PORT,
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

			log.Printf("Request: %v  -  %v  ",  r.Method, r.URL.Path)


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
	log.Printf("Server successfully started on port %v\n", HTTP_PORT)
	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)
	<-sigchan
	log.Printf("Shutting down the server\n")
	server.Shutdown(context.Background())
}
