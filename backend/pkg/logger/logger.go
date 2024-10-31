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
	l        *zap.Logger
	useExtra bool
	extra    ExtraLogger
}

func New() Logger {
	encoderConfig := zap.NewProductionEncoderConfig()
	encoderConfig.EncodeTime = zapcore.TimeEncoderOfLayout("2006-01-02 15:04:05.000")
	jsonEncoder := zapcore.NewJSONEncoder(encoderConfig)
	core := zapcore.NewCore(jsonEncoder, zapcore.AddSync(os.Stdout), zap.InfoLevel)
	baseLogger := zap.New(core, zap.AddCaller())
	logger := baseLogger.WithOptions(zap.AddCallerSkip(1))
	customLogger := &loggerImpl{l: logger}

	// Use it only for debugging purposes
	if doExtra := os.Getenv("ENABLE_EXTRA_LOGS"); doExtra == "true" {
		customLogger.extra = NewExtraLogger()
		customLogger.useExtra = true
	}
	return customLogger
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
	logStr := fmt.Sprintf(message, args...)
	l.prepare(ctx, l.l.With(zap.String("level", "debug"))).Debug(logStr)
	if l.useExtra {
		l.extra.Log(ctx, logStr)
	}
}

func (l *loggerImpl) Info(ctx context.Context, message string, args ...interface{}) {
	logStr := fmt.Sprintf(message, args...)
	l.prepare(ctx, l.l.With(zap.String("level", "info"))).Info(logStr)
	if l.useExtra {
		l.extra.Log(ctx, logStr)
	}
}

func (l *loggerImpl) Warn(ctx context.Context, message string, args ...interface{}) {
	logStr := fmt.Sprintf(message, args...)
	l.prepare(ctx, l.l.With(zap.String("level", "warn"))).Warn(logStr)
	if l.useExtra {
		l.extra.Log(ctx, logStr)
	}
}

func (l *loggerImpl) Error(ctx context.Context, message string, args ...interface{}) {
	logStr := fmt.Sprintf(message, args...)
	l.prepare(ctx, l.l.With(zap.String("level", "error"))).Error(logStr)
	if l.useExtra {
		l.extra.Log(ctx, logStr)
	}
}

func (l *loggerImpl) Fatal(ctx context.Context, message string, args ...interface{}) {
	logStr := fmt.Sprintf(message, args...)
	l.prepare(ctx, l.l.With(zap.String("level", "fatal"))).Fatal(logStr)
	if l.useExtra {
		l.extra.Log(ctx, logStr)
	}
}
