package api

import "net/http"

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

type ErrorResponse struct {
	Error string `json:"error"`
}
