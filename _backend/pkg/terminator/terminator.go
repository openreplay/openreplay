package terminator

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"openreplay/backend/pkg/logger"
)

// ServiceStopper is a common interface for all services
type ServiceStopper interface {
	Stop()
}

func Wait(log logger.Logger, s ServiceStopper) {
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	sig := <-sigChan
	log.Info(context.Background(), "caught signal %v: terminating", sig)
	s.Stop()
	os.Exit(0)
}
