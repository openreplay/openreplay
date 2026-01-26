package api

import (
	"errors"
	"net/http"
	"strconv"
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
		{"/{project}/sessions/{session}/favorite", "GET", h.favorite, []string{"SESSION_REPLAY"}, api.DoNotTrack},
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

	projID, err := api.GetProject(r)
	if err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	sessID, err := api.GetSessionID(r)
	if err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	var userID string
	if user := api.GetUser(r); user != nil {
		userID = user.GetIDAsString()
	} else {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusUnauthorized, errors.New("no user id"), startTime, r.URL.Path, bodySize)
		return
	}

	if err := h.favorites.DoFavorite(projID, sessID, userID); err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	res := map[string]interface{}{"data": map[string]interface{}{"sessionId": strconv.Itoa(int(sessID))}}
	h.responser.ResponseWithJSON(h.log, r.Context(), w, res, startTime, r.URL.Path, bodySize)
}
