package router

import (
	"fmt"
	"github.com/tomasen/realip"
	"log"
	"net"
	"net/http"
	"openreplay/backend/internal/http/geoip"
	"sync"
	"time"

	"github.com/gorilla/mux"
	http3 "openreplay/backend/internal/config/http"
	http2 "openreplay/backend/internal/http/services"
	"openreplay/backend/internal/http/util"
)

type BeaconSize struct {
	size int64
	time time.Time
}

type Router struct {
	router               *mux.Router
	cfg                  *http3.Config
	services             *http2.ServicesBuilder
	mutex                *sync.RWMutex
	beaconSizeCache      map[uint64]*BeaconSize // Cache for session's beaconSize
	compressionThreshold int64
}

func NewRouter(cfg *http3.Config, services *http2.ServicesBuilder) (*Router, error) {
	switch {
	case cfg == nil:
		return nil, fmt.Errorf("config is empty")
	case services == nil:
		return nil, fmt.Errorf("services is empty")
	}
	e := &Router{
		cfg:                  cfg,
		services:             services,
		mutex:                &sync.RWMutex{},
		beaconSizeCache:      make(map[uint64]*BeaconSize),
		compressionThreshold: cfg.CompressionThreshold,
	}
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

func (e *Router) getCompressionThreshold() int64 {
	return e.compressionThreshold
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

func (e *Router) ExtractGeoData(r *http.Request) *geoip.GeoRecord {
	ip := net.ParseIP(realip.FromRequest(r))
	return e.services.GeoIP.Parse(ip)
}

func (e *Router) init() {
	e.router = mux.NewRouter()

	// Root path
	e.router.HandleFunc("/", e.root)

	handlers := map[string]func(http.ResponseWriter, *http.Request){
		"/v1/web/not-started":      e.notStartedHandlerWeb,
		"/v1/web/start":            e.startSessionHandlerWeb,
		"/v1/web/i":                e.pushMessagesHandlerWeb,
		"/v1/web/feature-flags":    e.featureFlagsHandlerWeb,
		"/v1/web/images":           e.imagesUploaderHandlerWeb,
		"/v1/mobile/start":         e.startSessionHandlerIOS,
		"/v1/mobile/i":             e.pushMessagesHandlerIOS,
		"/v1/mobile/late":          e.pushLateMessagesHandlerIOS,
		"/v1/mobile/images":        e.imagesUploadHandlerIOS,
		"/v1/web/uxt/signals/test": e.sendUXTestSignal,
		"/v1/web/uxt/signals/task": e.sendUXTaskSignal,
	}
	getHandlers := map[string]func(http.ResponseWriter, *http.Request){
		"/v1/web/uxt/test/{id}":        e.getUXTestInfo,
		"/v1/web/uxt/upload-url":       e.getUXUploadUrl,
		"/v1/web/tags":                 e.getTags,
		"/v1/web/conditions/{project}": e.getConditions,
	}
	prefix := "/ingest"

	for path, handler := range handlers {
		e.router.HandleFunc(path, handler).Methods("POST", "OPTIONS")
		e.router.HandleFunc(prefix+path, handler).Methods("POST", "OPTIONS")
	}
	for path, handler := range getHandlers {
		e.router.HandleFunc(path, handler).Methods("GET", "OPTIONS")
		e.router.HandleFunc(prefix+path, handler).Methods("GET", "OPTIONS")
	}

	// CORS middleware
	e.router.Use(e.corsMiddleware)
}

func (e *Router) root(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
}

func (e *Router) corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if e.cfg.UseAccessControlHeaders {
			// Prepare headers for preflight requests
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "POST,GET")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type,Authorization,Content-Encoding")
		}
		if r.Method == http.MethodOptions {
			w.Header().Set("Cache-Control", "max-age=86400")
			w.WriteHeader(http.StatusOK)
			return
		}

		log.Printf("Request: %v  -  %v  ", r.Method, util.SafeString(r.URL.Path))

		// Serve request
		next.ServeHTTP(w, r)
	})
}

func (e *Router) GetHandler() http.Handler {
	return e.router
}
