package api

import (
	"errors"
	"net/http"
	"time"

	"openreplay/backend/pkg/favorite"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/server/api"
)

type handlersImpl struct {
	log       logger.Logger
	responser api.Responser
	favorites favorite.Favorites
}

func (h *handlersImpl) GetAll() []*api.Description {
	return []*api.Description{
		{"/v1/{project}/sessions/{session}/favorite", "GET", h.favorite, []string{"SESSION_REPLAY"}, api.DoNotTrack},
	}
}

func NewHandlers(log logger.Logger, responser api.Responser, favorites favorite.Favorites) (api.Handlers, error) {
	return &handlersImpl{
		log:       log,
		responser: responser,
		favorites: favorites,
	}, nil
}

func (h *handlersImpl) favorite(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	sessID := api.GetSession(r)
	var userID string
	if user := api.GetUser(r); user != nil {
		userID = user.GetIDAsString()
	} else {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusUnauthorized, errors.New("no user id"), startTime, r.URL.Path, bodySize)
	}

	//
	if h.favorites.IsExist(sessID, userID) {
		// If the session is already favorited, remove it
		if err := h.favorites.Remove(sessID, userID); err != nil {
			h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
			return
		}
	} else {
		// If the session is not favorited, add it
		if err := h.favorites.Add(sessID, userID); err != nil {
			h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
			return
		}
	}

	h.responser.ResponseOK(h.log, r.Context(), w, startTime, r.URL.Path, bodySize)
}
