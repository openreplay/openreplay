package api

import (
	"archive/tar"
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

	gzip "github.com/klauspost/pgzip"

	config "openreplay/backend/internal/config/images"
	"openreplay/backend/pkg/cleanup/registry"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/queue/types"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/sessions"
	"openreplay/backend/pkg/token"
)

type handlersImpl struct {
	log        logger.Logger
	cfg        *config.Config
	responser  api.Responser
	tokenizer  *token.Tokenizer
	sessions   sessions.Sessions
	producer   types.Producer
	cleanupReg registry.Registry
}

func NewHandlers(cfg *config.Config, log logger.Logger, responser api.Responser, tokenizer *token.Tokenizer, sessions sessions.Sessions, producer types.Producer, cleanupReg registry.Registry) (api.Handlers, error) {
	return &handlersImpl{
		log:        log,
		cfg:        cfg,
		responser:  responser,
		tokenizer:  tokenizer,
		sessions:   sessions,
		producer:   producer,
		cleanupReg: cleanupReg,
	}, nil
}

func (h *handlersImpl) GetAll() []*api.Description {
	return []*api.Description{
		{"/v1/mobile/images", "POST", h.imagesUploaderHandlerMobile, api.NoPermissions, api.DoNotTrack},
	}
}

type ImagesMessage struct {
	Name string
	Data []byte
}

func (e *handlersImpl) imagesUploaderHandlerMobile(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()

	sessionData, err := e.tokenizer.ParseFromHTTPRequest(r)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusUnauthorized, err, startTime, r.URL.Path, 0)
		return
	}
	r = r.WithContext(context.WithValue(r.Context(), "sessionID", fmt.Sprintf("%d", sessionData.ID)))

	if info, err := e.sessions.Get(sessionData.ID); err == nil {
		r = r.WithContext(context.WithValue(r.Context(), "projectID", fmt.Sprintf("%d", info.ProjectID)))
	}

	if r.Body == nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, errors.New("request body is empty"), startTime, r.URL.Path, 0)
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, e.cfg.FileSizeLimit)
	defer r.Body.Close()

	err = r.ParseMultipartForm(10 << 20)
	if errors.Is(err, http.ErrNotMultipart) || errors.Is(err, http.ErrMissingBoundary) {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusUnsupportedMediaType, err, startTime, r.URL.Path, 0)
		return
	} else if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, 0)
		return
	}

	isFrames := false
	if len(r.MultipartForm.Value["type"]) > 0 && r.MultipartForm.Value["type"][0] == "frames" {
		isFrames = true
	}

	if len(r.MultipartForm.File) > 0 {
		e.cleanupReg.Register(sessionData.ID, true, sessionData.ExpTime+registry.DeadlineGraceMs)
	}

	for _, fileHeaderList := range r.MultipartForm.File {
		for _, fileHeader := range fileHeaderList {
			file, err := fileHeader.Open()
			if err != nil {
				e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, 0)
				return
			}

			data, err := io.ReadAll(file)
			if err != nil {
				file.Close()
				e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, 0)
				return
			}
			file.Close()

			uncompressedStream, err := gzip.NewReader(bytes.NewReader(data))
			if err != nil {
				e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, fmt.Errorf("can't unpack gzip: %s", err), startTime, r.URL.Path, 0)
				return
			}
			defer uncompressedStream.Close()

			frames := bytes.NewBuffer([]byte{})
			var fileName string

			if isFrames {
				if _, err = frames.ReadFrom(uncompressedStream); err != nil {
					e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, 0)
					return
				}
			} else {
				tarReader := tar.NewReader(uncompressedStream)
				for {
					header, err := tarReader.Next()
					if err != nil {
						if err == io.EOF {
							break
						}
						e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, fmt.Errorf("can't read tar header: %s", err), startTime, r.URL.Path, 0)
						return
					}

					if header.Typeflag != tar.TypeReg {
						e.log.Error(r.Context(), "ExtractTarGz: unknown type: %d in %s", header.Typeflag, header.Name)
						continue
					}
					name, ts, err := parseImageName(header.Name)
					if err != nil {
						e.log.Error(r.Context(), "ExtractTarGz: can't parse time for %s: %s", header.Name, err)
						continue
					}
					if fileName == "" {
						fileName = name
					}
					prevLen := frames.Len()
					if err := binary.Write(frames, binary.LittleEndian, ts); err != nil {
						e.log.Error(r.Context(), "can't write frame's time for %s: %s", header.Name, err)
						frames.Truncate(prevLen)
						continue
					}
					if err := binary.Write(frames, binary.LittleEndian, uint32(header.Size)); err != nil {
						e.log.Error(r.Context(), "can't write frame's size for %s: %s", header.Name, err)
						frames.Truncate(prevLen)
						continue
					}
					if _, err := frames.ReadFrom(tarReader); err != nil {
						e.log.Error(r.Context(), "can't read frame for %s: %s", header.Name, err)
						frames.Truncate(prevLen)
						continue
					}
				}
			}

			packedMessage, err := json.Marshal(&ImagesMessage{
				Name: fileName,
				Data: frames.Bytes(),
			})
			if err != nil {
				e.log.Warn(r.Context(), "can't marshal screenshot message, err: %s", err)
				e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, 0)
				return
			}
			if err := e.producer.Produce(e.cfg.TopicRawImages, sessionData.ID, packedMessage); err != nil {
				e.log.Warn(r.Context(), "failed to send image to queue: %s", err)
			}
			e.responser.ResponseOK(e.log, r.Context(), w, startTime, r.URL.Path, 0)
			return
		}
	}
	e.log.Warn(r.Context(), "no images to upload")
	e.responser.ResponseOK(e.log, r.Context(), w, startTime, r.URL.Path, 0)
}

func parseImageName(imageName string) (baseName string, ts uint64, err error) {
	ext := filepath.Ext(imageName) // .jpeg
	name := strings.TrimSuffix(imageName, ext)
	// Last segment after '_' is the timestamp
	idx := strings.LastIndex(name, "_")
	if idx < 0 {
		return "", 0, fmt.Errorf("image name has no underscore: %s", imageName)
	}
	baseName = name[:idx] + ext // for example "1771238515501_33.jpeg"
	ts, err = strconv.ParseUint(name[idx+1:], 10, 64)
	if err != nil {
		return "", 0, fmt.Errorf("can't parse timestamp from canvas name %s: %w", imageName, err)
	}
	return baseName, ts, nil
}
