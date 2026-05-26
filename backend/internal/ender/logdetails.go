package ender

import (
	"context"
	"strings"

	"openreplay/backend/pkg/logger"
)

type SessionEndType int

const (
	FailedSessionEnd SessionEndType = iota + 1
	DuplicatedSessionEnd
	NegativeDuration
	ShorterDuration
	NewSessionEnd
	NoSessionInDB
)

type LogDetails struct {
	Failed     map[uint64]uint64
	Duplicated map[uint64]uint64
	Negative   map[uint64]uint64
	Shorter    map[uint64]int64
	NotFound   map[uint64]uint64
	Diff       map[uint64]int64
	Updated    int
	New        int
}

func NewLogDetails() *LogDetails {
	return &LogDetails{
		Failed:     make(map[uint64]uint64),
		Duplicated: make(map[uint64]uint64),
		Negative:   make(map[uint64]uint64),
		Shorter:    make(map[uint64]int64),
		NotFound:   make(map[uint64]uint64),
		Diff:       make(map[uint64]int64),
	}
}

func (l *LogDetails) Log(log logger.Logger, ctx context.Context) {
	if n := len(l.Failed); n > 0 {
		log.Debug(ctx, "sessions with wrong duration: %d, %v", n, l.Failed)
	}
	if n := len(l.Negative); n > 0 {
		log.Debug(ctx, "sessions with negative duration: %d, %v", n, l.Negative)
	}
	if n := len(l.NotFound); n > 0 {
		log.Debug(ctx, "sessions without info in DB: %d, %v", n, l.NotFound)
	}
	var logBuilder strings.Builder
	logValues := []interface{}{}

	if len(l.Failed) > 0 {
		logBuilder.WriteString("failed: %d, ")
		logValues = append(logValues, len(l.Failed))
	}
	if len(l.Negative) > 0 {
		logBuilder.WriteString("negative: %d, ")
		logValues = append(logValues, len(l.Negative))
	}
	if len(l.Shorter) > 0 {
		logBuilder.WriteString("shorter: %d, ")
		logValues = append(logValues, len(l.Shorter))
	}
	if len(l.Duplicated) > 0 {
		logBuilder.WriteString("same: %d, ")
		logValues = append(logValues, len(l.Duplicated))
	}
	if l.Updated > 0 {
		logBuilder.WriteString("updated: %d, ")
		logValues = append(logValues, l.Updated)
	}
	if l.New > 0 {
		logBuilder.WriteString("new: %d, ")
		logValues = append(logValues, l.New)
	}
	if len(l.NotFound) > 0 {
		logBuilder.WriteString("not found: %d, ")
		logValues = append(logValues, len(l.NotFound))
	}

	if logBuilder.Len() > 0 {
		logMessage := logBuilder.String()
		logMessage = logMessage[:len(logMessage)-2]
		log.Info(ctx, logMessage, logValues...)
	}
}
