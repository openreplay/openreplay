package api

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/mux"

	spotConfig "openreplay/backend/internal/config/spot"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/objectstorage"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/server/keys"
	"openreplay/backend/pkg/server/user"
	"openreplay/backend/pkg/spot/service"
	"openreplay/backend/pkg/spot/transcoder"
)

type handlersImpl struct {
	log           logger.Logger
	responser     *api.Responser
	jsonSizeLimit int64
	spots         service.Spots
	objStorage    objectstorage.ObjectStorage
	transcoder    transcoder.Transcoder
	keys          keys.Keys
}

func NewHandlers(log logger.Logger, cfg *spotConfig.Config, responser *api.Responser, spots service.Spots, objStore objectstorage.ObjectStorage, transcoder transcoder.Transcoder, keys keys.Keys) (api.Handlers, error) {
	return &handlersImpl{
		log:           log,
		responser:     responser,
		jsonSizeLimit: cfg.JsonSizeLimit,
		spots:         spots,
		objStorage:    objStore,
		transcoder:    transcoder,
		keys:          keys,
	}, nil
}

func (e *handlersImpl) GetAll() []*api.Description {
	return []*api.Description{
		{"/v1/spots", e.createSpot, "POST"},
		{"/v1/spots/{id}", e.getSpot, "GET"},
		{"/v1/spots/{id}", e.updateSpot, "PATCH"},
		{"/v1/spots", e.getSpots, "GET"},
		{"/v1/spots", e.deleteSpots, "DELETE"},
		{"/v1/spots/{id}/comment", e.addComment, "POST"},
		{"/v1/spots/{id}/uploaded", e.uploadedSpot, "POST"},
		{"/v1/spots/{id}/video", e.getSpotVideo, "GET"},
		{"/v1/spots/{id}/public-key", e.getPublicKey, "GET"},
		{"/v1/spots/{id}/public-key", e.updatePublicKey, "PATCH"},
		{"/v1/spots/{id}/status", e.spotStatus, "GET"},
		{"/v1/ping", e.ping, "GET"},
	}
}

func (e *handlersImpl) ping(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
}

func (e *handlersImpl) createSpot(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	bodyBytes, err := api.ReadBody(e.log, w, r, e.jsonSizeLimit)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}
	bodySize = len(bodyBytes)

	req := &CreateSpotRequest{}
	if err := json.Unmarshal(bodyBytes, req); err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	// Creat a spot
	currUser := r.Context().Value("userData").(*user.User)
	newSpot, err := e.spots.Add(currUser, req.Name, req.Comment, req.Duration, req.Crop)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	// Parse and upload preview image
	previewImage, err := getSpotPreview(req.Preview)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	previewName := fmt.Sprintf("%d/preview.jpeg", newSpot.ID)
	if err = e.objStorage.Upload(bytes.NewReader(previewImage), previewName, "image/jpeg", objectstorage.NoContentEncoding, objectstorage.NoCompression); err != nil {
		e.log.Error(r.Context(), "can't upload preview image: %s", err)
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, errors.New("can't upload preview image"), startTime, r.URL.Path, bodySize)
		return
	}

	mobURL, err := e.getUploadMobURL(newSpot.ID)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}
	videoURL, err := e.getUploadVideoURL(newSpot.ID)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	resp := &CreateSpotResponse{
		ID:       strconv.Itoa(int(newSpot.ID)),
		MobURL:   mobURL,
		VideoURL: videoURL,
	}
	e.responser.ResponseWithJSON(e.log, r.Context(), w, resp, startTime, r.URL.Path, bodySize)
}

func getSpotPreview(preview string) ([]byte, error) {
	parts := strings.Split(preview, ",")
	if len(parts) != 2 {
		return nil, fmt.Errorf("invalid preview format")
	}
	base64Str := parts[1]

	data, err := base64.StdEncoding.DecodeString(base64Str)
	if err != nil {
		return nil, fmt.Errorf("can't decode base64 preview: %s", err)
	}
	return data, nil
}

func (e *handlersImpl) getUploadMobURL(spotID uint64) (string, error) {
	mobKey := fmt.Sprintf("%d/events.mob", spotID)
	mobURL, err := e.objStorage.GetPreSignedUploadUrl(mobKey)
	if err != nil {
		return "", fmt.Errorf("can't get mob URL: %s", err)
	}
	return mobURL, nil
}

func (e *handlersImpl) getUploadVideoURL(spotID uint64) (string, error) {
	mobKey := fmt.Sprintf("%d/video.webm", spotID)
	mobURL, err := e.objStorage.GetPreSignedUploadUrl(mobKey)
	if err != nil {
		return "", fmt.Errorf("can't get video URL: %s", err)
	}
	return mobURL, nil
}

func getSpotID(r *http.Request) (uint64, error) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	if idStr == "" {
		return 0, fmt.Errorf("empty spot id")
	}
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("invalid spot id")
	}
	if id <= 0 {
		return 0, fmt.Errorf("invalid spot id")
	}
	return id, nil
}

func getSpotsRequest(r *http.Request) (*GetSpotsRequest, error) {
	params := r.URL.Query()
	page := params.Get("page")
	limit := params.Get("limit")
	pageNum, _ := strconv.ParseUint(page, 10, 64)
	limitNum, _ := strconv.ParseUint(limit, 10, 64)
	req := &GetSpotsRequest{
		Query:    params.Get("query"),
		FilterBy: params.Get("filterBy"),
		Order:    params.Get("order"),
		Page:     pageNum,
		Limit:    limitNum,
	}
	return req, nil
}

func (e *handlersImpl) getPreviewURL(spotID uint64) (string, error) {
	previewKey := fmt.Sprintf("%d/preview.jpeg", spotID)
	previewURL, err := e.objStorage.GetPreSignedDownloadUrl(previewKey)
	if err != nil {
		return "", fmt.Errorf("can't get preview URL: %s", err)
	}
	return previewURL, nil
}

func (e *handlersImpl) getMobURL(spotID uint64) (string, error) {
	mobKey := fmt.Sprintf("%d/events.mob", spotID)
	mobURL, err := e.objStorage.GetPreSignedDownloadUrl(mobKey)
	if err != nil {
		return "", fmt.Errorf("can't get mob URL: %s", err)
	}
	return mobURL, nil
}

func (e *handlersImpl) getVideoURL(spotID uint64) (string, error) {
	mobKey := fmt.Sprintf("%d/video.webm", spotID) // TODO: later return url to m3u8 file
	mobURL, err := e.objStorage.GetPreSignedDownloadUrl(mobKey)
	if err != nil {
		return "", fmt.Errorf("can't get video URL: %s", err)
	}
	return mobURL, nil
}

func (e *handlersImpl) getSpot(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	id, err := getSpotID(r)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	user := r.Context().Value("userData").(*user.User)
	res, err := e.spots.GetByID(user, id)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}
	if res == nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusNotFound, fmt.Errorf("spot not found"), startTime, r.URL.Path, bodySize)
		return
	}

	previewUrl, err := e.getPreviewURL(id)
	if err != nil {
		e.log.Error(r.Context(), "can't get preview URL: %s", err)
	}
	mobURL, err := e.getMobURL(id)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}
	videoURL, err := e.getVideoURL(id)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	spotInfo := &Info{
		Name:       res.Name,
		UserEmail:  res.UserEmail,
		Duration:   res.Duration,
		Comments:   res.Comments,
		CreatedAt:  res.CreatedAt,
		PreviewURL: previewUrl,
		MobURL:     mobURL,
		VideoURL:   videoURL,
	}
	playlist, err := e.transcoder.GetSpotStreamPlaylist(id)
	if err != nil {
		e.log.Warn(r.Context(), "can't get stream playlist: %s", err)
	} else {
		spotInfo.StreamFile = base64.StdEncoding.EncodeToString(playlist)
	}

	e.responser.ResponseWithJSON(e.log, r.Context(), w, &GetSpotResponse{Spot: spotInfo}, startTime, r.URL.Path, bodySize)
}

func (e *handlersImpl) updateSpot(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	id, err := getSpotID(r)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	bodyBytes, err := api.ReadBody(e.log, w, r, e.jsonSizeLimit)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}
	bodySize = len(bodyBytes)

	req := &UpdateSpotRequest{}
	if err := json.Unmarshal(bodyBytes, req); err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	user := r.Context().Value("userData").(*user.User)
	_, err = e.spots.UpdateName(user, id, req.Name)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	e.responser.ResponseOK(e.log, r.Context(), w, startTime, r.URL.Path, bodySize)
}

func (e *handlersImpl) getSpots(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	req, err := getSpotsRequest(r)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	user := r.Context().Value("userData").(*user.User)
	opts := &service.GetOpts{
		NameFilter: req.Query, Order: req.Order, Page: req.Page, Limit: req.Limit}
	switch req.FilterBy {
	case "own":
		opts.UserID = user.ID
	default:
		opts.TenantID = user.TenantID
	}
	spots, total, tenantHasSpots, err := e.spots.Get(user, opts)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}
	res := make([]ShortInfo, 0, len(spots))
	for _, spot := range spots {
		previewUrl, err := e.getPreviewURL(spot.ID)
		if err != nil {
			e.log.Error(r.Context(), "can't get preview URL: %s", err)
		}
		res = append(res, ShortInfo{
			ID:         strconv.Itoa(int(spot.ID)),
			Name:       spot.Name,
			UserEmail:  spot.UserEmail,
			Duration:   spot.Duration,
			CreatedAt:  spot.CreatedAt,
			PreviewURL: previewUrl,
		})
	}
	e.responser.ResponseWithJSON(e.log, r.Context(), w, &GetSpotsResponse{Spots: res, Total: total, TenantHasSpots: tenantHasSpots}, startTime, r.URL.Path, bodySize)
}

func (e *handlersImpl) deleteSpots(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	bodyBytes, err := api.ReadBody(e.log, w, r, e.jsonSizeLimit)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}
	bodySize = len(bodyBytes)

	req := &DeleteSpotRequest{}
	if err := json.Unmarshal(bodyBytes, req); err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}
	spotsToDelete := make([]uint64, 0, len(req.SpotIDs))
	for _, idStr := range req.SpotIDs {
		id, err := strconv.ParseUint(idStr, 10, 64)
		if err != nil {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, fmt.Errorf("invalid spot id: %s", idStr), startTime, r.URL.Path, bodySize)
			return
		}
		spotsToDelete = append(spotsToDelete, id)
	}

	user := r.Context().Value("userData").(*user.User)
	if err := e.spots.Delete(user, spotsToDelete); err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	e.responser.ResponseOK(e.log, r.Context(), w, startTime, r.URL.Path, bodySize)
}

func (e *handlersImpl) addComment(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	id, err := getSpotID(r)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	bodyBytes, err := api.ReadBody(e.log, w, r, e.jsonSizeLimit)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}
	bodySize = len(bodyBytes)

	req := &AddCommentRequest{}
	if err := json.Unmarshal(bodyBytes, req); err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	user := r.Context().Value("userData").(*user.User)
	updatedSpot, err := e.spots.AddComment(user, id, &service.Comment{UserName: req.UserName, Text: req.Comment})
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	mobURL, err := e.getMobURL(id)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}
	videoURL, err := e.getVideoURL(id)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	spotInfo := &Info{
		Name:      updatedSpot.Name,
		Duration:  updatedSpot.Duration,
		Comments:  updatedSpot.Comments,
		CreatedAt: updatedSpot.CreatedAt,
		MobURL:    mobURL,
		VideoURL:  videoURL,
	}
	e.responser.ResponseWithJSON(e.log, r.Context(), w, &GetSpotResponse{Spot: spotInfo}, startTime, r.URL.Path, bodySize)
}

func (e *handlersImpl) uploadedSpot(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	id, err := getSpotID(r)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	user := r.Context().Value("userData").(*user.User)
	spot, err := e.spots.GetByID(user, id) // check if spot exists
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}
	e.log.Info(r.Context(), "uploaded spot %+v, from user: %+v", spot, user)
	if err := e.transcoder.Process(spot); err != nil {
		e.log.Error(r.Context(), "can't add transcoding task: %s", err)
	}

	e.responser.ResponseOK(e.log, r.Context(), w, startTime, r.URL.Path, bodySize)
}

func (e *handlersImpl) getSpotVideo(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	id, err := getSpotID(r)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	key := fmt.Sprintf("%d/video.webm", id)
	videoURL, err := e.objStorage.GetPreSignedDownloadUrl(key)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	resp := map[string]interface{}{
		"url": videoURL,
	}
	e.responser.ResponseWithJSON(e.log, r.Context(), w, resp, startTime, r.URL.Path, bodySize)
}

func (e *handlersImpl) getSpotStream(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	id, err := getSpotID(r)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	// Example data to serve as the file content
	streamPlaylist, err := e.transcoder.GetSpotStreamPlaylist(id)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	// Create a buffer with the file content
	buffer := bytes.NewBuffer(streamPlaylist)

	// Set the headers for the response
	w.Header().Set("Content-Disposition", "attachment; filename=index.m3u8")
	w.Header().Set("Content-Type", "application/vnd.apple.mpegurl") //"application/octet-stream")
	w.Header().Set("Content-Length", string(len(streamPlaylist)))

	// Write the content of the buffer to the response writer
	if _, err := buffer.WriteTo(w); err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}
}

func (e *handlersImpl) getPublicKey(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	id, err := getSpotID(r)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	user := r.Context().Value("userData").(*user.User)
	key, err := e.keys.Get(id, user)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusNotFound, err, startTime, r.URL.Path, bodySize)
		} else {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		}
		return
	}
	resp := map[string]interface{}{
		"key": key,
	}
	e.responser.ResponseWithJSON(e.log, r.Context(), w, resp, startTime, r.URL.Path, bodySize)
}

func (e *handlersImpl) updatePublicKey(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	id, err := getSpotID(r)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	bodyBytes, err := api.ReadBody(e.log, w, r, e.jsonSizeLimit)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}
	bodySize = len(bodyBytes)

	req := &UpdateSpotPublicKeyRequest{}
	if err := json.Unmarshal(bodyBytes, req); err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	user := r.Context().Value("userData").(*user.User)
	key, err := e.keys.Set(id, req.Expiration, user)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}
	resp := map[string]interface{}{
		"key": key,
	}
	e.responser.ResponseWithJSON(e.log, r.Context(), w, resp, startTime, r.URL.Path, bodySize)
}

func (e *handlersImpl) spotStatus(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	id, err := getSpotID(r)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	user := r.Context().Value("userData").(*user.User)
	status, err := e.spots.GetStatus(user, id)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}
	resp := map[string]interface{}{
		"status": status,
	}
	e.responser.ResponseWithJSON(e.log, r.Context(), w, resp, startTime, r.URL.Path, bodySize)
}
