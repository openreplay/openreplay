package logger

import (
	"context"
	"fmt"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
	"os"
)

type Logger interface {
	Debug(ctx context.Context, message string, args ...interface{})
	Info(ctx context.Context, message string, args ...interface{})
	Warn(ctx context.Context, message string, args ...interface{})
	Error(ctx context.Context, message string, args ...interface{})
	Fatal(ctx context.Context, message string, args ...interface{})
}

type loggerImpl struct {
	l *zap.Logger
}

func New() Logger {
	encoderConfig := zap.NewProductionEncoderConfig()
	encoderConfig.EncodeTime = zapcore.TimeEncoderOfLayout("2006-01-02 15:04:05.000")
	jsonEncoder := zapcore.NewJSONEncoder(encoderConfig)
	core := zapcore.NewCore(jsonEncoder, zapcore.AddSync(os.Stdout), zap.InfoLevel)
	baseLogger := zap.New(core, zap.AddCaller())
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
	if tVer, ok := ctx.Value("tracker").(string); ok {
		logger = logger.With(zap.String("tracker", tVer))
	}
	if httpMethod, ok := ctx.Value("httpMethod").(string); ok {
		logger = logger.With(zap.String("httpMethod", httpMethod))
	}
	if urlPath, ok := ctx.Value("url").(string); ok {
		logger = logger.With(zap.String("url", urlPath))
	}
	if batch, ok := ctx.Value("batch").(string); ok {
		logger = logger.With(zap.String("batch", batch))
	}
	return logger
}

func (l *loggerImpl) Debug(ctx context.Context, message string, args ...interface{}) {
	l.prepare(ctx, l.l.With(zap.String("level", "debug"))).Debug(fmt.Sprintf(message, args...))
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
