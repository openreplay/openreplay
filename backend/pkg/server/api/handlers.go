package api

import "net/http"

type Description struct {
	Path        string
	Method      string
	Handler     http.HandlerFunc
	Permissions []string
	AuditTrail  []string
}

var NoPermissions []string = nil
var DoNotTrack []string = nil

type Handlers interface {
	GetAll() []*Description
}
