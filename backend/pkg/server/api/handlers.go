package api

import "net/http"

type Description struct {
	Path    string
	Handler http.HandlerFunc
	Methods []string
}

type Handlers interface {
	GetAll() []*Description
}
