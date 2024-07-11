package spot

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/gorilla/mux"
	"io"
	"net/http"
	metrics "openreplay/backend/pkg/metrics/http"
	"openreplay/backend/pkg/objectstorage"
	"strconv"
	"strings"
	"time"
)

func (e *Router) createSpot(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	bodyBytes, err := e.readBody(w, r, e.cfg.JsonSizeLimit)
	if err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}
	bodySize = len(bodyBytes)

	req := &CreateSpotRequest{}
	if err := json.Unmarshal(bodyBytes, req); err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	// Creat a spot
	currUser := r.Context().Value("userData").(*User)
	newSpot, err := e.services.Spots.Add(currUser, req.Name, req.Comment, req.Duration)
	if err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	// Parse and upload preview image
	previewImage, err := getSpotPreview(req.Preview)
	if err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	previewName := fmt.Sprintf("%d/preview.jpeg", newSpot.ID)
	if err = e.services.ObjStorage.Upload(bytes.NewReader(previewImage), previewName, "image/jpeg", objectstorage.NoCompression); err != nil {
		e.log.Error(r.Context(), "can't upload preview image: %s", err)
		e.ResponseWithError(r.Context(), w, http.StatusInternalServerError, errors.New("can't upload preview image"), startTime, r.URL.Path, bodySize)
		return
	}

	mobURL, err := e.getUploadMobURL(newSpot.ID)
	if err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}
	videoURL, err := e.getUploadVideoURL(newSpot.ID)
	if err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	resp := &CreateSpotResponse{
		ID:       strconv.Itoa(int(newSpot.ID)),
		MobURL:   mobURL,
		VideoURL: videoURL,
	}
	e.ResponseWithJSON(r.Context(), w, resp, startTime, r.URL.Path, bodySize)
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

func (e *Router) getUploadMobURL(spotID uint64) (string, error) {
	mobKey := fmt.Sprintf("%d/events.mob", spotID)
	mobURL, err := e.services.ObjStorage.GetPreSignedUploadUrl(mobKey)
	if err != nil {
		return "", fmt.Errorf("can't get mob URL: %s", err)
	}
	return mobURL, nil
}

func (e *Router) getUploadVideoURL(spotID uint64) (string, error) {
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
	vars := mux.Vars(r)
	page := vars["page"]
	limit := vars["limit"]
	pageNum, _ := strconv.ParseUint(page, 10, 64)
	limitNum, _ := strconv.ParseUint(limit, 10, 64)
	req := &GetSpotsRequest{
		Query:    vars["query"],
		FilterBy: vars["filterBy"],
		Order:    vars["order"],
		Page:     pageNum,
		Limit:    limitNum,
	}
	return req, nil
}

func (e *Router) getPreviewURL(spotID uint64) (string, error) {
	previewKey := fmt.Sprintf("%d/preview.jpeg", spotID)
	previewURL, err := e.services.ObjStorage.GetPreSignedDownloadUrl(previewKey)
	if err != nil {
		return "", fmt.Errorf("can't get preview URL: %s", err)
	}
	return previewURL, nil
}

func (e *Router) getMobURL(spotID uint64) (string, error) {
	mobKey := fmt.Sprintf("%d/events.mob", spotID)
	mobURL, err := e.services.ObjStorage.GetPreSignedDownloadUrl(mobKey)
	if err != nil {
		return "", fmt.Errorf("can't get mob URL: %s", err)
	}
	return mobURL, nil
}

func (e *Router) getVideoURL(spotID uint64) (string, error) {
	mobKey := fmt.Sprintf("%d/video.webm", spotID) // TODO: later return url to m3u8 file
	mobURL, err := e.services.ObjStorage.GetPreSignedDownloadUrl(mobKey)
	if err != nil {
		return "", fmt.Errorf("can't get video URL: %s", err)
	}
	return mobURL, nil
}

func (e *Router) getSpot(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	id, err := getSpotID(r)
	if err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	user := r.Context().Value("userData").(*User)
	res, err := e.services.Spots.Get(user, &GetOpts{SpotID: id})
	if err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}
	if len(res) == 0 {
		e.ResponseWithError(r.Context(), w, http.StatusNotFound, fmt.Errorf("spot not found"), startTime, r.URL.Path, bodySize)
		return
	}

	mobURL, err := e.getMobURL(id)
	if err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}
	videoURL, err := e.getVideoURL(id)
	if err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	spotInfo := &Info{
		Name:      res[0].Name,
		UserEmail: res[0].UserEmail,
		Duration:  res[0].Duration,
		Comments:  res[0].Comments,
		CreatedAt: res[0].CreatedAt,
		MobURL:    mobURL,
		VideoURL:  videoURL,
		Key:       res[0].Key,
	}
	e.ResponseWithJSON(r.Context(), w, &GetSpotResponse{Spot: spotInfo}, startTime, r.URL.Path, bodySize)
}

func (e *Router) updateSpot(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	id, err := getSpotID(r)
	if err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	bodyBytes, err := e.readBody(w, r, e.cfg.JsonSizeLimit)
	if err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}
	bodySize = len(bodyBytes)

	req := &UpdateSpotRequest{}
	if err := json.Unmarshal(bodyBytes, req); err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	user := r.Context().Value("userData").(*User)
	updatedSpot, err := e.services.Spots.Update(user, &Update{ID: id, NewName: req.Name})
	if err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	mobURL, err := e.getMobURL(id)
	if err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}
	videoURL, err := e.getVideoURL(id)
	if err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	spotInfo := &Info{
		Name:      updatedSpot.Name,
		Duration:  updatedSpot.Duration,
		Comments:  updatedSpot.Comments,
		CreatedAt: updatedSpot.CreatedAt,
		MobURL:    mobURL,
		VideoURL:  videoURL,
		Key:       updatedSpot.Key,
	}
	e.ResponseWithJSON(r.Context(), w, &GetSpotResponse{Spot: spotInfo}, startTime, r.URL.Path, bodySize)
}

func (e *Router) getSpots(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	req, err := getSpotsRequest(r)
	if err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	user := r.Context().Value("userData").(*User)
	opts := &GetOpts{
		NameFilter: req.Query, Order: req.Order, Offset: req.Page * req.Limit, Limit: req.Limit}
	switch req.FilterBy {
	case "own":
		opts.UserID = user.ID
	default:
		opts.TenantID = user.TenantID
	}
	spots, err := e.services.Spots.Get(user, opts)
	if err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
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
	e.ResponseWithJSON(r.Context(), w, &GetSpotsResponse{Spots: res, Total: uint64(len(res))}, startTime, r.URL.Path, bodySize)
}

func (e *Router) deleteSpots(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	bodyBytes, err := e.readBody(w, r, e.cfg.JsonSizeLimit)
	if err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}
	bodySize = len(bodyBytes)

	req := &DeleteSpotRequest{}
	if err := json.Unmarshal(bodyBytes, req); err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	user := r.Context().Value("userData").(*User)
	if err := e.services.Spots.Delete(user, req.SpotIDs); err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	e.ResponseOK(r.Context(), w, startTime, r.URL.Path, bodySize)
}

func (e *Router) addComment(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	id, err := getSpotID(r)
	if err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	bodyBytes, err := e.readBody(w, r, e.cfg.JsonSizeLimit)
	if err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}
	bodySize = len(bodyBytes)

	req := &AddCommentRequest{}
	if err := json.Unmarshal(bodyBytes, req); err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	user := r.Context().Value("userData").(*User)
	updatedSpot, err := e.services.Spots.Update(user, &Update{ID: id, NewComment: &Comment{UserName: req.UserName, Text: req.Comment}})
	if err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	mobURL, err := e.getMobURL(id)
	if err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}
	videoURL, err := e.getVideoURL(id)
	if err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	spotInfo := &Info{
		Name:      updatedSpot.Name,
		Duration:  updatedSpot.Duration,
		Comments:  updatedSpot.Comments,
		CreatedAt: updatedSpot.CreatedAt,
		MobURL:    mobURL,
		VideoURL:  videoURL,
		Key:       updatedSpot.Key,
	}
	e.ResponseWithJSON(r.Context(), w, &GetSpotResponse{Spot: spotInfo}, startTime, r.URL.Path, bodySize)
}

func (e *Router) uploadedSpot(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	id, err := getSpotID(r)
	if err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	user := r.Context().Value("userData").(*User)
	e.log.Info(r.Context(), "uploaded spot %d, from user: %+v", id, user)
	if err := e.services.Transcoder.Transcode(id); err != nil {
		e.log.Error(r.Context(), "can't add transcoding task: %s", err)
	}

	e.ResponseOK(r.Context(), w, startTime, r.URL.Path, bodySize)
}

func (e *Router) getSpotVideo(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	id, err := getSpotID(r)
	if err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	key := fmt.Sprintf("%d/video.webm", id)
	videoURL, err := e.services.ObjStorage.GetPreSignedUploadUrl(key)
	if err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	resp := map[string]interface{}{
		"url": videoURL,
	}
	e.ResponseWithJSON(r.Context(), w, resp, startTime, r.URL.Path, bodySize)
}

func recordMetrics(requestStart time.Time, url string, code, bodySize int) {
	if bodySize > 0 {
		metrics.RecordRequestSize(float64(bodySize), url, code)
	}
	metrics.IncreaseTotalRequests()
	metrics.RecordRequestDuration(float64(time.Now().Sub(requestStart).Milliseconds()), url, code)
}

func (e *Router) readBody(w http.ResponseWriter, r *http.Request, limit int64) ([]byte, error) {
	body := http.MaxBytesReader(w, r.Body, limit)
	bodyBytes, err := io.ReadAll(body)

	// Close body
	if closeErr := body.Close(); closeErr != nil {
		e.log.Warn(r.Context(), "error while closing request body: %s", closeErr)
	}
	if err != nil {
		return nil, err
	}
	return bodyBytes, nil
}

func (e *Router) ResponseOK(ctx context.Context, w http.ResponseWriter, requestStart time.Time, url string, bodySize int) {
	w.WriteHeader(http.StatusOK)
	e.log.Info(ctx, "response ok")
	recordMetrics(requestStart, url, http.StatusOK, bodySize)
}

func (e *Router) ResponseWithJSON(ctx context.Context, w http.ResponseWriter, res interface{}, requestStart time.Time, url string, bodySize int) {
	e.log.Info(ctx, "response ok")
	body, err := json.Marshal(res)
	if err != nil {
		e.log.Error(ctx, "can't marshal response: %s", err)
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write(body)
	recordMetrics(requestStart, url, http.StatusOK, bodySize)
}

type response struct {
	Error string `json:"error"`
}

func (e *Router) ResponseWithError(ctx context.Context, w http.ResponseWriter, code int, err error, requestStart time.Time, url string, bodySize int) {
	e.log.Error(ctx, "response error, code: %d, error: %s", code, err)
	body, err := json.Marshal(&response{err.Error()})
	if err != nil {
		e.log.Error(ctx, "can't marshal response: %s", err)
	}
	w.WriteHeader(code)
	w.Write(body)
	recordMetrics(requestStart, url, code, bodySize)
}
