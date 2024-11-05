package api

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	spotConfig "openreplay/backend/internal/config/spot"
	"openreplay/backend/pkg/logger"
	api2 "openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/server/auth"
	"openreplay/backend/pkg/spot"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/mux"

	"openreplay/backend/pkg/objectstorage"
	"openreplay/backend/pkg/spot/service"
)

type Handlers struct {
	log           logger.Logger
	JsonSizeLimit int64
	services      *spot.ServicesBuilder
}

func NewHandlers(log logger.Logger, cfg *spotConfig.Config, services *spot.ServicesBuilder) (*Handlers, error) {
	return &Handlers{
		log:           log,
		JsonSizeLimit: cfg.JsonSizeLimit,
		services:      services,
	}, nil
}

func (e *Handlers) GetAll() []*api2.HandlerDescription {
	return []*api2.HandlerDescription{
		{"/v1/spots", e.createSpot, []string{"POST", "OPTIONS"}},
		{"/v1/spots/{id}", e.getSpot, []string{"GET", "OPTIONS"}},
		{"/v1/spots/{id}", e.updateSpot, []string{"PATCH", "OPTIONS"}},
		{"/v1/spots", e.getSpots, []string{"GET", "OPTIONS"}},
		{"/v1/spots", e.deleteSpots, []string{"DELETE", "OPTIONS"}},
		{"/v1/spots/{id}/comment", e.addComment, []string{"POST", "OPTIONS"}},
		{"/v1/spots/{id}/uploaded", e.uploadedSpot, []string{"POST", "OPTIONS"}},
		{"/v1/spots/{id}/video", e.getSpotVideo, []string{"GET", "OPTIONS"}},
		{"/v1/spots/{id}/public-key", e.getPublicKey, []string{"GET", "OPTIONS"}},
		{"/v1/spots/{id}/public-key", e.updatePublicKey, []string{"PATCH", "OPTIONS"}},
		{"/v1/spots/{id}/status", e.spotStatus, []string{"GET", "OPTIONS"}},
		{"/v1/ping", e.ping, []string{"GET", "OPTIONS"}},
	}
}

func (e *Handlers) ping(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
}

func (e *Handlers) createSpot(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	bodyBytes, err := api2.ReadBody(e.log, w, r, e.JsonSizeLimit)
	if err != nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}
	bodySize = len(bodyBytes)

	req := &CreateSpotRequest{}
	if err := json.Unmarshal(bodyBytes, req); err != nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	// Creat a spot
	currUser := r.Context().Value("userData").(*auth.User)
	newSpot, err := e.services.Spots.Add(currUser, req.Name, req.Comment, req.Duration, req.Crop)
	if err != nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	// Parse and upload preview image
	previewImage, err := getSpotPreview(req.Preview)
	if err != nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	previewName := fmt.Sprintf("%d/preview.jpeg", newSpot.ID)
	if err = e.services.ObjStorage.Upload(bytes.NewReader(previewImage), previewName, "image/jpeg", objectstorage.NoCompression); err != nil {
		e.log.Error(r.Context(), "can't upload preview image: %s", err)
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, errors.New("can't upload preview image"), startTime, r.URL.Path, bodySize)
		return
	}

	mobURL, err := e.getUploadMobURL(newSpot.ID)
	if err != nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}
	videoURL, err := e.getUploadVideoURL(newSpot.ID)
	if err != nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	resp := &CreateSpotResponse{
		ID:       strconv.Itoa(int(newSpot.ID)),
		MobURL:   mobURL,
		VideoURL: videoURL,
	}
	api2.ResponseWithJSON(e.log, r.Context(), w, resp, startTime, r.URL.Path, bodySize)
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

func (e *Handlers) getUploadMobURL(spotID uint64) (string, error) {
	mobKey := fmt.Sprintf("%d/events.mob", spotID)
	mobURL, err := e.services.ObjStorage.GetPreSignedUploadUrl(mobKey)
	if err != nil {
		return "", fmt.Errorf("can't get mob URL: %s", err)
	}
	return mobURL, nil
}

func (e *Handlers) getUploadVideoURL(spotID uint64) (string, error) {
	mobKey := fmt.Sprintf("%d/video.webm", spotID)
	mobURL, err := e.services.ObjStorage.GetPreSignedUploadUrl(mobKey)
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

func (e *Handlers) getPreviewURL(spotID uint64) (string, error) {
	previewKey := fmt.Sprintf("%d/preview.jpeg", spotID)
	previewURL, err := e.services.ObjStorage.GetPreSignedDownloadUrl(previewKey)
	if err != nil {
		return "", fmt.Errorf("can't get preview URL: %s", err)
	}
	return previewURL, nil
}

func (e *Handlers) getMobURL(spotID uint64) (string, error) {
	mobKey := fmt.Sprintf("%d/events.mob", spotID)
	mobURL, err := e.services.ObjStorage.GetPreSignedDownloadUrl(mobKey)
	if err != nil {
		return "", fmt.Errorf("can't get mob URL: %s", err)
	}
	return mobURL, nil
}

func (e *Handlers) getVideoURL(spotID uint64) (string, error) {
	mobKey := fmt.Sprintf("%d/video.webm", spotID) // TODO: later return url to m3u8 file
	mobURL, err := e.services.ObjStorage.GetPreSignedDownloadUrl(mobKey)
	if err != nil {
		return "", fmt.Errorf("can't get video URL: %s", err)
	}
	return mobURL, nil
}

func (e *Handlers) getSpot(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	id, err := getSpotID(r)
	if err != nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	user := r.Context().Value("userData").(*auth.User)
	res, err := e.services.Spots.GetByID(user, id)
	if err != nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}
	if res == nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusNotFound, fmt.Errorf("spot not found"), startTime, r.URL.Path, bodySize)
		return
	}

	previewUrl, err := e.getPreviewURL(id)
	if err != nil {
		e.log.Error(r.Context(), "can't get preview URL: %s", err)
	}
	mobURL, err := e.getMobURL(id)
	if err != nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}
	videoURL, err := e.getVideoURL(id)
	if err != nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
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
	playlist, err := e.services.Transcoder.GetSpotStreamPlaylist(id)
	if err != nil {
		e.log.Warn(r.Context(), "can't get stream playlist: %s", err)
	} else {
		spotInfo.StreamFile = base64.StdEncoding.EncodeToString(playlist)
	}

	api2.ResponseWithJSON(e.log, r.Context(), w, &GetSpotResponse{Spot: spotInfo}, startTime, r.URL.Path, bodySize)
}

func (e *Handlers) updateSpot(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	id, err := getSpotID(r)
	if err != nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	bodyBytes, err := api2.ReadBody(e.log, w, r, e.JsonSizeLimit)
	if err != nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}
	bodySize = len(bodyBytes)

	req := &UpdateSpotRequest{}
	if err := json.Unmarshal(bodyBytes, req); err != nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	user := r.Context().Value("userData").(*auth.User)
	_, err = e.services.Spots.UpdateName(user, id, req.Name)
	if err != nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	api2.ResponseOK(e.log, r.Context(), w, startTime, r.URL.Path, bodySize)
}

func (e *Handlers) getSpots(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	req, err := getSpotsRequest(r)
	if err != nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	user := r.Context().Value("userData").(*auth.User)
	opts := &service.GetOpts{
		NameFilter: req.Query, Order: req.Order, Page: req.Page, Limit: req.Limit}
	switch req.FilterBy {
	case "own":
		opts.UserID = user.ID
	default:
		opts.TenantID = user.TenantID
	}
	spots, total, tenantHasSpots, err := e.services.Spots.Get(user, opts)
	if err != nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
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
	api2.ResponseWithJSON(e.log, r.Context(), w, &GetSpotsResponse{Spots: res, Total: total, TenantHasSpots: tenantHasSpots}, startTime, r.URL.Path, bodySize)
}

func (e *Handlers) deleteSpots(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	bodyBytes, err := api2.ReadBody(e.log, w, r, e.JsonSizeLimit)
	if err != nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}
	bodySize = len(bodyBytes)

	req := &DeleteSpotRequest{}
	if err := json.Unmarshal(bodyBytes, req); err != nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}
	spotsToDelete := make([]uint64, 0, len(req.SpotIDs))
	for _, idStr := range req.SpotIDs {
		id, err := strconv.ParseUint(idStr, 10, 64)
		if err != nil {
			api2.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, fmt.Errorf("invalid spot id: %s", idStr), startTime, r.URL.Path, bodySize)
			return
		}
		spotsToDelete = append(spotsToDelete, id)
	}

	user := r.Context().Value("userData").(*auth.User)
	if err := e.services.Spots.Delete(user, spotsToDelete); err != nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	api2.ResponseOK(e.log, r.Context(), w, startTime, r.URL.Path, bodySize)
}

func (e *Handlers) addComment(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	id, err := getSpotID(r)
	if err != nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	bodyBytes, err := api2.ReadBody(e.log, w, r, e.JsonSizeLimit)
	if err != nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}
	bodySize = len(bodyBytes)

	req := &AddCommentRequest{}
	if err := json.Unmarshal(bodyBytes, req); err != nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	user := r.Context().Value("userData").(*auth.User)
	updatedSpot, err := e.services.Spots.AddComment(user, id, &service.Comment{UserName: req.UserName, Text: req.Comment})
	if err != nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	mobURL, err := e.getMobURL(id)
	if err != nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}
	videoURL, err := e.getVideoURL(id)
	if err != nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
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
	api2.ResponseWithJSON(e.log, r.Context(), w, &GetSpotResponse{Spot: spotInfo}, startTime, r.URL.Path, bodySize)
}

func (e *Handlers) uploadedSpot(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	id, err := getSpotID(r)
	if err != nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	user := r.Context().Value("userData").(*auth.User)
	spot, err := e.services.Spots.GetByID(user, id) // check if spot exists
	if err != nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}
	e.log.Info(r.Context(), "uploaded spot %+v, from user: %+v", spot, user)
	if err := e.services.Transcoder.Process(spot); err != nil {
		e.log.Error(r.Context(), "can't add transcoding task: %s", err)
	}

	api2.ResponseOK(e.log, r.Context(), w, startTime, r.URL.Path, bodySize)
}

func (e *Handlers) getSpotVideo(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	id, err := getSpotID(r)
	if err != nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	key := fmt.Sprintf("%d/video.webm", id)
	videoURL, err := e.services.ObjStorage.GetPreSignedDownloadUrl(key)
	if err != nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	resp := map[string]interface{}{
		"url": videoURL,
	}
	api2.ResponseWithJSON(e.log, r.Context(), w, resp, startTime, r.URL.Path, bodySize)
}

func (e *Handlers) getSpotStream(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	id, err := getSpotID(r)
	if err != nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	// Example data to serve as the file content
	streamPlaylist, err := e.services.Transcoder.GetSpotStreamPlaylist(id)
	if err != nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
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
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}
}

func (e *Handlers) getPublicKey(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	id, err := getSpotID(r)
	if err != nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	user := r.Context().Value("userData").(*auth.User)
	key, err := e.services.Keys.Get(id, user)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			api2.ResponseWithError(e.log, r.Context(), w, http.StatusNotFound, err, startTime, r.URL.Path, bodySize)
		} else {
			api2.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		}
		return
	}
	resp := map[string]interface{}{
		"key": key,
	}
	api2.ResponseWithJSON(e.log, r.Context(), w, resp, startTime, r.URL.Path, bodySize)
}

func (e *Handlers) updatePublicKey(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	id, err := getSpotID(r)
	if err != nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	bodyBytes, err := api2.ReadBody(e.log, w, r, e.JsonSizeLimit)
	if err != nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}
	bodySize = len(bodyBytes)

	req := &UpdateSpotPublicKeyRequest{}
	if err := json.Unmarshal(bodyBytes, req); err != nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	user := r.Context().Value("userData").(*auth.User)
	key, err := e.services.Keys.Set(id, req.Expiration, user)
	if err != nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}
	resp := map[string]interface{}{
		"key": key,
	}
	api2.ResponseWithJSON(e.log, r.Context(), w, resp, startTime, r.URL.Path, bodySize)
}

func (e *Handlers) spotStatus(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	id, err := getSpotID(r)
	if err != nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	user := r.Context().Value("userData").(*auth.User)
	status, err := e.services.Spots.GetStatus(user, id)
	if err != nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}
	resp := map[string]interface{}{
		"status": status,
	}
	api2.ResponseWithJSON(e.log, r.Context(), w, resp, startTime, r.URL.Path, bodySize)
}
