package api

import "net/http"

type Description struct {
	Path        string
	Method      string
	Handler     http.HandlerFunc
	Permissions []string
	TrackName   string
}

type Handlers interface {
	GetAll() []*Description
}

var NoPermissions []string
var DoNotTrack string
