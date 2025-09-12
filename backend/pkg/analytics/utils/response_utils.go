package utils

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-playground/validator/v10"

	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/server/user"
)

type RequestContext struct {
	StartTime time.Time
	BodySize  int
	Path      string
}

func InitRequestContext(r *http.Request) *RequestContext {
	return &RequestContext{
		StartTime: time.Now(),
		BodySize:  0,
		Path:      r.URL.Path,
	}
}

func GetCurrentUser(r *http.Request) *user.User {
	return r.Context().Value("userData").(*user.User)
}

func ParseJSONBody(log logger.Logger, responser *api.Responser, validator *validator.Validate, ctx *RequestContext, w http.ResponseWriter, r *http.Request, jsonSizeLimit int64, dest interface{}) error {
	bodyBytes, err := api.ReadBody(log, w, r, jsonSizeLimit)
	if err != nil {
		responser.ResponseWithError(log, r.Context(), w, http.StatusRequestEntityTooLarge, err, ctx.StartTime, ctx.Path, ctx.BodySize)
		return err
	}
	ctx.BodySize = len(bodyBytes)

	if err := json.Unmarshal(bodyBytes, dest); err != nil {
		responser.ResponseWithError(log, r.Context(), w, http.StatusBadRequest, err, ctx.StartTime, ctx.Path, ctx.BodySize)
		return err
	}

	if err := validator.Struct(dest); err != nil {
		responser.ResponseWithError(log, r.Context(), w, http.StatusBadRequest, err, ctx.StartTime, ctx.Path, ctx.BodySize)
		return err
	}

	return nil
}
