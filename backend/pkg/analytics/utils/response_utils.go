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

func HandleError(log logger.Logger, responser *api.Responser, ctx *RequestContext, w http.ResponseWriter, r *http.Request, statusCode int, err error) {
	responser.ResponseWithError(log, r.Context(), w, statusCode, err, ctx.StartTime, ctx.Path, ctx.BodySize)
}

func HandleSuccess(log logger.Logger, responser *api.Responser, ctx *RequestContext, w http.ResponseWriter, r *http.Request, data interface{}) {
	responser.ResponseWithJSON(log, r.Context(), w, map[string]interface{}{"data": data}, ctx.StartTime, ctx.Path, ctx.BodySize)
}

func GetCurrentUser(r *http.Request) *user.User {
	return r.Context().Value("userData").(*user.User)
}

func ParseJSONBody(log logger.Logger, responser *api.Responser, validator *validator.Validate, ctx *RequestContext, w http.ResponseWriter, r *http.Request, jsonSizeLimit int64, dest interface{}) error {
	bodyBytes, err := api.ReadBody(log, w, r, jsonSizeLimit)
	if err != nil {
		HandleError(log, responser, ctx, w, r, http.StatusRequestEntityTooLarge, err)
		return err
	}
	ctx.BodySize = len(bodyBytes)

	if err := json.Unmarshal(bodyBytes, dest); err != nil {
		HandleError(log, responser, ctx, w, r, http.StatusBadRequest, err)
		return err
	}

	if err := validator.Struct(dest); err != nil {
		HandleError(log, responser, ctx, w, r, http.StatusBadRequest, err)
		return err
	}

	return nil
}
