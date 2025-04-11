package auth

import (
	"net/http"

	"github.com/gorilla/mux"

	ctxStore "github.com/docker/distribution/context"
)

func (e *authImpl) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, err := e.IsAuthorized(r.Header.Get("Authorization"), getPermissions(r.URL.Path), e.isExtensionRequest(r))
		if err != nil {
			if !e.isSpotWithKeyRequest(r) {
				e.log.Warn(r.Context(), "Unauthorized request, wrong jwt token: %s", err)
				w.WriteHeader(http.StatusUnauthorized)
				return
			}

			user, err = e.keys.IsValid(r.URL.Query().Get("key"))
			if err != nil {
				e.log.Warn(r.Context(), "Unauthorized request, wrong public key: %s", err)
				w.WriteHeader(http.StatusUnauthorized)
				return
			}
		}

		r = r.WithContext(ctxStore.WithValues(r.Context(), map[string]interface{}{"userData": user}))
		next.ServeHTTP(w, r)
	})
}

func (e *authImpl) isExtensionRequest(r *http.Request) bool {
	pathTemplate, err := mux.CurrentRoute(r).GetPathTemplate()
	if err != nil {
		e.log.Error(r.Context(), "failed to get path template: %s", err)
	} else {
		if pathTemplate == e.prefix+"/v1/ping" ||
			(pathTemplate == e.prefix+"/v1/spots" && r.Method == "POST") ||
			(pathTemplate == e.prefix+"/v1/spots/{id}/uploaded" && r.Method == "POST") {
			return true
		}
	}
	return false
}

func (e *authImpl) isSpotWithKeyRequest(r *http.Request) bool {
	if e.keys == nil {
		return false
	}
	pathTemplate, err := mux.CurrentRoute(r).GetPathTemplate()
	if err != nil {
		return false
	}
	getSpotPrefix := e.prefix + "/v1/spots/{id}"            // GET
	addCommentPrefix := e.prefix + "/v1/spots/{id}/comment" // POST
	getStatusPrefix := e.prefix + "/v1/spots/{id}/status"   // GET
	if (pathTemplate == getSpotPrefix && r.Method == "GET") ||
		(pathTemplate == addCommentPrefix && r.Method == "POST") ||
		(pathTemplate == getStatusPrefix && r.Method == "GET") {
		return true
	}
	return false
}
