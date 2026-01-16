package api

import (
	"net/http"
	"time"

	"openreplay/backend/pkg/logger"
)

type RequestHandler interface {
	Handle(handler func(ctx *RequestContext) (any, int, error)) http.HandlerFunc
	HandleWithBody(handler func(ctx *RequestContext) (any, int, error)) http.HandlerFunc
}

type requestHandlerImpl struct {
	log           logger.Logger
	responser     Responser
	jsonSizeLimit int64
}

func NewRequestHandler(log logger.Logger, responser Responser, jsonSizeLimit int64) RequestHandler {
	return &requestHandlerImpl{
		log:           log,
		responser:     responser,
		jsonSizeLimit: jsonSizeLimit,
	}
}

func (h *requestHandlerImpl) Handle(handler func(ctx *RequestContext) (any, int, error)) http.HandlerFunc {
	return h.respond(handler, false)
}

func (h *requestHandlerImpl) HandleWithBody(handler func(ctx *RequestContext) (any, int, error)) http.HandlerFunc {
	return h.respond(handler, true)
}

func (h *requestHandlerImpl) respond(handler func(ctx *RequestContext) (any, int, error), withBody bool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := &RequestContext{Writer: w, Request: r, StartTime: time.Now()}

		if withBody {
			var err error
			ctx.Body, err = ReadBody(h.log, w, r, h.jsonSizeLimit)
			if err != nil {
				h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusRequestEntityTooLarge, err, ctx.StartTime, r.URL.Path, ctx.BodySize)
				return
			}
			ctx.BodySize = len(ctx.Body)
		}

		response, statusCode, err := handler(ctx)
		if err != nil {
			if statusCode == 0 {
				statusCode = http.StatusInternalServerError
			}
			h.responser.ResponseWithError(h.log, r.Context(), w, statusCode, err, ctx.StartTime, r.URL.Path, ctx.BodySize)
			return
		}
		h.responser.ResponseWithJSON(h.log, r.Context(), w, map[string]interface{}{"data": response}, ctx.StartTime, r.URL.Path, ctx.BodySize)
	}
}
