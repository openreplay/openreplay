package api

import "net/http"

const (
	SESSION_REPLAY  string = "SESSION_REPLAY"
	SESSION_EXPORT  string = "SESSION_EXPORT"
	DEV_TOOLS       string = "DEV_TOOLS"
	METRICS         string = "METRICS"
	ASSIST_LIVE     string = "ASSIST_LIVE"
	ASSIST_CALL     string = "ASSIST_CALL"
	FEATURE_FLAGS   string = "FEATURE_FLAGS"
	SPOT            string = "SPOT"
	SPOT_PUBLIC     string = "SPOT_PUBLIC"
	DATA_MANAGEMENT string = "DATA_MANAGEMENT"
)

type Description struct {
	Path        string
	Method      string
	Handler     http.HandlerFunc
	Permissions []string
	AuditTrail  string
}

var NoPermissions []string = nil
var DoNotTrack string = ""

const PublicKeyPermission = "API_KEY_ENDPOINT"

type Handlers interface {
	GetAll() []*Description
}

type ServiceBuilder interface {
	Handlers() []Handlers
}

type MiddlewareBuilder interface {
	Middlewares() []RouterMiddleware
}

type RouterMiddleware interface {
	Middleware(next http.Handler) http.Handler
}
