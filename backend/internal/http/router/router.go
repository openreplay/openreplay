package router

import (
	"context"
	"fmt"
	"github.com/gorilla/mux"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/metric/instrument/syncfloat64"
	"log"
	"net/http"
	http3 "openreplay/backend/internal/config/http"
	http2 "openreplay/backend/internal/http/services"
	"openreplay/backend/internal/http/util"
	"openreplay/backend/pkg/monitoring"
	"sync"
	"time"
)

type BeaconSize struct {
	size int64
	time time.Time
}

type Router struct {
	router          *mux.Router
	cfg             *http3.Config
	services        *http2.ServicesBuilder
	requestSize     syncfloat64.Histogram
	requestDuration syncfloat64.Histogram
	totalRequests   syncfloat64.Counter
	mutex           *sync.RWMutex
	beaconSizeCache map[uint64]*BeaconSize // Cache for session's beaconSize
}

func NewRouter(cfg *http3.Config, services *http2.ServicesBuilder, metrics *monitoring.Metrics) (*Router, error) {
	switch {
	case cfg == nil:
		return nil, fmt.Errorf("config is empty")
	case services == nil:
		return nil, fmt.Errorf("services is empty")
	case metrics == nil:
		return nil, fmt.Errorf("metrics is empty")
	}
	e := &Router{
		cfg:             cfg,
		services:        services,
		mutex:           &sync.RWMutex{},
		beaconSizeCache: make(map[uint64]*BeaconSize),
	}
	e.initMetrics(metrics)
	e.init()
	go e.clearBeaconSizes()
	return e, nil
}

func (e *Router) addBeaconSize(sessionID uint64, size int64) {
	if size <= 0 {
		return
	}
	e.mutex.Lock()
	defer e.mutex.Unlock()
	e.beaconSizeCache[sessionID] = &BeaconSize{
		size: size,
		time: time.Now(),
	}
}

func (e *Router) getBeaconSize(sessionID uint64) int64 {
	e.mutex.RLock()
	defer e.mutex.RUnlock()
	if beaconSize, ok := e.beaconSizeCache[sessionID]; ok {
		beaconSize.time = time.Now()
		return beaconSize.size
	}
	return e.cfg.BeaconSizeLimit
}

func (e *Router) clearBeaconSizes() {
	for {
		time.Sleep(time.Minute * 2)
		now := time.Now()
		e.mutex.Lock()
		for sid, bs := range e.beaconSizeCache {
			if now.Sub(bs.time) > time.Minute*3 {
				delete(e.beaconSizeCache, sid)
			}
		}
		e.mutex.Unlock()
	}
}

func (e *Router) init() {
	e.router = mux.NewRouter()

	// Root path
	e.router.HandleFunc("/", e.root)

	handlers := map[string]func(http.ResponseWriter, *http.Request){
		"/v1/web/not-started": e.notStartedHandlerWeb,
		"/v1/web/start":       e.startSessionHandlerWeb,
		"/v1/web/i":           e.pushMessagesHandlerWeb,
		"/v1/ios/start":       e.startSessionHandlerIOS,
		"/v1/ios/i":           e.pushMessagesHandlerIOS,
		"/v1/ios/late":        e.pushLateMessagesHandlerIOS,
		"/v1/ios/images":      e.imagesUploadHandlerIOS,
	}
	prefix := "/ingest"

	for path, handler := range handlers {
		e.router.HandleFunc(path, handler).Methods("POST", "OPTIONS")
		e.router.HandleFunc(prefix+path, handler).Methods("POST", "OPTIONS")
	}

	// CORS middleware
	e.router.Use(e.corsMiddleware)
}

func (e *Router) initMetrics(metrics *monitoring.Metrics) {
	var err error
	e.requestSize, err = metrics.RegisterHistogram("requests_body_size")
	if err != nil {
		log.Printf("can't create requests_body_size metric: %s", err)
	}
	e.requestDuration, err = metrics.RegisterHistogram("requests_duration")
	if err != nil {
		log.Printf("can't create requests_duration metric: %s", err)
	}
	e.totalRequests, err = metrics.RegisterCounter("requests_total")
	if err != nil {
		log.Printf("can't create requests_total metric: %s", err)
	}
}

func (e *Router) root(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
}

func (e *Router) corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Prepare headers for preflight requests
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type,Authorization")
		if r.Method == http.MethodOptions {
			w.Header().Set("Cache-Control", "max-age=86400")
			w.WriteHeader(http.StatusOK)
			return
		}

		log.Printf("Request: %v  -  %v  ", r.Method, util.SafeString(r.URL.Path))

		requestStart := time.Now()

		// Serve request
		next.ServeHTTP(w, r)

		metricsContext, _ := context.WithTimeout(context.Background(), time.Millisecond*100)
		e.totalRequests.Add(metricsContext, 1)
		e.requestDuration.Record(metricsContext,
			float64(time.Now().Sub(requestStart).Milliseconds()),
			[]attribute.KeyValue{attribute.String("method", r.URL.Path)}...,
		)
	})
}

func (e *Router) GetHandler() http.Handler {
	return e.router
}
