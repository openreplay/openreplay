package service

import (
	"context"
	"openreplay/backend/pkg/messages"
	"strings"
)

func (v *ImageStorage) MessageIterator(data []byte, sessID uint64) {
	isSessionEnd := func(data []byte) bool {
		reader := messages.NewBytesReader(data)
		msgType, err := reader.ReadUint()
		if err != nil {
			return false
		}
		if msgType != messages.MsgSessionEnd {
			return false
		}
		_, err = messages.ReadMessage(msgType, reader)
		if err != nil {
			return false
		}
		return true
	}
	isTriggerEvent := func(data []byte) (string, string, bool) {
		reader := messages.NewBytesReader(data)
		msgType, err := reader.ReadUint()
		if err != nil {
			return "", "", false
		}
		if msgType != messages.MsgCustomEvent {
			return "", "", false
		}
		msg, err := messages.ReadMessage(msgType, reader)
		if err != nil {
			return "", "", false
		}
		customEvent := msg.(*messages.CustomEvent)
		return customEvent.Payload, customEvent.Name, true
	}
	isCleanSessionEvent := func(data []byte) bool {
		reader := messages.NewBytesReader(data)
		msgType, err := reader.ReadUint()
		if err != nil {
			return false
		}
		if msgType != messages.MsgCleanSession {
			return false
		}
		_, err = messages.ReadMessage(msgType, reader)
		if err != nil {
			return false
		}
		return true
	}
	sessCtx := context.WithValue(context.Background(), "sessionID", sessID)

	if isSessionEnd(data) {
		if err := v.PrepareSessionCanvases(sessCtx, sessID); err != nil {
			if !strings.Contains(err.Error(), "no such file or directory") {
				v.log.Error(sessCtx, "can't pack session's canvases: %s", err)
			}
		}
	} else if path, name, ok := isTriggerEvent(data); ok {
		if err := v.ProcessSessionCanvas(sessCtx, sessID, path, name); err != nil {
			v.log.Error(sessCtx, "can't process session's canvas: %s", err)
		}
	} else if isCleanSessionEvent(data) {
		if err := v.CleanSession(sessCtx, sessID); err != nil {
			v.log.Error(sessCtx, "can't clean session: %s", err)
		}
	} else {
		if err := v.SaveCanvasToDisk(sessCtx, sessID, data); err != nil {
			v.log.Error(sessCtx, "can't process canvas image: %s", err)
		}
	}
}
