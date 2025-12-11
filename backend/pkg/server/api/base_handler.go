package api

import "openreplay/backend/pkg/logger"

type BaseHandler struct {
	log           logger.Logger
	responser     Responser
	jsonSizeLimit int64
}

func NewBaseHandler(log logger.Logger, responser Responser, jsonSizeLimit int64) *BaseHandler {
	return &BaseHandler{
		log:           log,
		responser:     responser,
		jsonSizeLimit: jsonSizeLimit,
	}
}

func (h *BaseHandler) Log() logger.Logger {
	return h.log
}

func (h *BaseHandler) Responser() Responser {
	return h.responser
}

func (h *BaseHandler) JsonSizeLimit() int64 {
	return h.jsonSizeLimit
}