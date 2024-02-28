package logger

import (
	"context"
	"fmt"
	"go.uber.org/zap"
	"log"
)

type Logger interface {
	Info(ctx context.Context, message string, args ...interface{})
	Warn(ctx context.Context, message string, args ...interface{})
	Error(ctx context.Context, message string, args ...interface{})
	Fatal(ctx context.Context, message string, args ...interface{})
}

type loggerImpl struct {
	l *zap.Logger
}

func New() Logger {
	baseLogger, err := zap.NewProduction()
	if err != nil {
		log.Fatalf("can't init zap logger: %s", err)
	}
	logger := baseLogger.WithOptions(zap.AddCallerSkip(1))
	return &loggerImpl{l: logger}
}

func (l *loggerImpl) prepare(ctx context.Context, logger *zap.Logger) *zap.Logger {
	if sID, ok := ctx.Value("sessionID").(string); ok {
		logger = logger.With(zap.String("sessionID", sID))
	}
	if pID, ok := ctx.Value("projectID").(string); ok {
		logger = logger.With(zap.String("projectID", pID))
	}
	if tVer, ok := ctx.Value("trackerVersion").(string); ok {
		logger = logger.With(zap.String("trackerVersion", tVer))
	}
	if httpMethod, ok := ctx.Value("httpMethod").(string); ok {
		logger = logger.With(zap.String("httpMethod", httpMethod))
	}
	if urlPath, ok := ctx.Value("urlPath").(string); ok {
		logger = logger.With(zap.String("urlPath", urlPath))
	}
	return logger
}

func (l *loggerImpl) Info(ctx context.Context, message string, args ...interface{}) {
	l.prepare(ctx, l.l.With(zap.String("level", "info"))).Info(fmt.Sprintf(message, args...))
}

func (l *loggerImpl) Warn(ctx context.Context, message string, args ...interface{}) {
	l.prepare(ctx, l.l.With(zap.String("level", "warn"))).Warn(fmt.Sprintf(message, args...))
}

func (l *loggerImpl) Error(ctx context.Context, message string, args ...interface{}) {
	l.prepare(ctx, l.l.With(zap.String("level", "error"))).Error(fmt.Sprintf(message, args...))
}

func (l *loggerImpl) Fatal(ctx context.Context, message string, args ...interface{}) {
	l.prepare(ctx, l.l.With(zap.String("level", "fatal"))).Fatal(fmt.Sprintf(message, args...))
}
