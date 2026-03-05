package api

import (
	"bytes"
	"context"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	config "openreplay/backend/internal/config/canvases"
	"openreplay/backend/internal/http/util"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/queue/types"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/sessions"
	"openreplay/backend/pkg/token"
)

type handlersImpl struct {
	log       logger.Logger
	cfg       *config.Config
	responser api.Responser
	tokenizer *token.Tokenizer
	sessions  sessions.Sessions
	producer  types.Producer
}

func NewHandlers(cfg *config.Config, log logger.Logger, responser api.Responser, tokenizer *token.Tokenizer, sessions sessions.Sessions, producer types.Producer) (api.Handlers, error) {
	return &handlersImpl{
		log:       log,
		cfg:       cfg,
		responser: responser,
		tokenizer: tokenizer,
		sessions:  sessions,
		producer:  producer,
	}, nil
}

func (h *handlersImpl) GetAll() []*api.Description {
	return []*api.Description{
		{"/v1/web/images", "POST", h.imagesUploaderHandlerWeb, api.NoPermissions, api.DoNotTrack},
	}
}

type ImagesMessage struct {
	Name string
	Data []byte
}

func (h *handlersImpl) imagesUploaderHandlerWeb(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()

	sessionData, err := h.tokenizer.ParseFromHTTPRequest(r)
	if err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusUnauthorized, err, startTime, r.URL.Path, 0)
		return
	}
	r = r.WithContext(context.WithValue(r.Context(), "sessionID", fmt.Sprintf("%d", sessionData.ID)))
	if info, err := h.sessions.Get(sessionData.ID); err == nil {
		r = r.WithContext(context.WithValue(r.Context(), "projectID", fmt.Sprintf("%d", info.ProjectID)))
	}

	//if r.Body == nil {
	//	h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusBadRequest, errors.New("request body is empty"), startTime, r.URL.Path, 0)
	//	return
	//}
	//r.Body = http.MaxBytesReader(w, r.Body, h.cfg.FileSizeLimit)
	//defer r.Body.Close()

	err = r.ParseMultipartForm(h.cfg.FileSizeLimit)
	if errors.Is(err, http.ErrNotMultipart) || errors.Is(err, http.ErrMissingBoundary) {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusUnsupportedMediaType, err, startTime, r.URL.Path, 0)
		return
	} else if err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, 0)
		return
	}

	isFrames := false
	if len(r.MultipartForm.Value["type"]) > 0 && r.MultipartForm.Value["type"][0] == "frames" {
		isFrames = true
	}

	frames := bytes.NewBuffer([]byte{})
	msg := ImagesMessage{}

	// Iterate over uploaded files
	for _, fileHeaderList := range r.MultipartForm.File {
		for _, fileHeader := range fileHeaderList {
			file, err := fileHeader.Open()
			if err != nil {
				h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, 0)
				return
			}

			// Read the file content
			fileBytes, err := io.ReadAll(file)
			if err != nil {
				file.Close()
				h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, 0)
				return
			}
			file.Close()

			fileName := util.SafeString(fileHeader.Filename)

			if isFrames {
				if !strings.HasSuffix(fileName, ".frames") {
					h.log.Error(r.Context(), "file name does not end with .frames: %s", fileName)
					h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusUnsupportedMediaType, errors.New("file name does not end with .frames"), startTime, r.URL.Path, 0)
					return
				}

				data, err := json.Marshal(&ImagesMessage{
					Name: fileName,
					Data: fileBytes,
				})
				if err != nil {
					h.log.Warn(r.Context(), "can't marshal screenshot message, err: %s", err)
					h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, 0)
					return
				}
				if err := h.producer.Produce(h.cfg.TopicCanvasImages, sessionData.ID, data); err != nil {
					h.log.Warn(r.Context(), "can't send screenshot message to queue, err: %s", err)
				}
				h.responser.ResponseOK(h.log, r.Context(), w, startTime, r.URL.Path, 0)
				return
			}

			baseName, ts, err := parseImageName(fileName)
			if err != nil {
				h.log.Error(r.Context(), "can't parse canvas name %s: %s", fileName, err)
				continue
			}
			if msg.Name == "" {
				msg.Name = baseName
			}
			if err := binary.Write(frames, binary.LittleEndian, ts); err != nil {
				h.log.Error(r.Context(), "can't write frame's time for %s: %s", fileName, err)
			}
			if err := binary.Write(frames, binary.LittleEndian, uint32(len(fileBytes))); err != nil {
				h.log.Error(r.Context(), "can't write frame's size for %s: %s", fileName, err)
			}
			frames.Write(fileBytes)
		}
	}

	if frames.Len() == 0 {
		h.log.Warn(r.Context(), "no frames to upload")
		h.responser.ResponseOK(h.log, r.Context(), w, startTime, r.URL.Path, 0)
		return
	}

	h.log.Debug(r.Context(), "uploading image, name: %s", msg.Name)

	msg.Data = frames.Bytes()
	data, err := json.Marshal(&msg)
	if err != nil {
		h.log.Warn(r.Context(), "can't marshal screenshot message, err: %s", err)
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, 0)
		return
	}
	if err := h.producer.Produce(h.cfg.TopicCanvasImages, sessionData.ID, data); err != nil {
		h.log.Warn(r.Context(), "can't send screenshot message to queue, err: %s", err)
	}

	h.responser.ResponseOK(h.log, r.Context(), w, startTime, r.URL.Path, 0)
}

func parseImageName(canvasName string) (baseName string, ts uint64, err error) {
	ext := filepath.Ext(canvasName) // .webp, .png, .jpg, .avif
	name := strings.TrimSuffix(canvasName, ext)
	// Last segment after '_' is the timestamp
	idx := strings.LastIndex(name, "_")
	if idx < 0 {
		return "", 0, fmt.Errorf("canvas name has no underscore: %s", canvasName)
	}
	baseName = name[:idx] + ext // for example "1771238515501_33.webp"
	ts, err = strconv.ParseUint(name[idx+1:], 10, 64)
	if err != nil {
		return "", 0, fmt.Errorf("can't parse timestamp from canvas name %s: %w", canvasName, err)
	}
	return baseName, ts, nil
}
