package api

import "net/http"

type Description struct {
	Path    string
	Handler http.HandlerFunc
	Method  string
}

type Handlers interface {
	GetAll() []*Description
}
