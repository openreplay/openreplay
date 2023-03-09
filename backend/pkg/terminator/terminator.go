package terminator

import (
	"log"
	"os"
	"os/signal"
	"syscall"
)

// ServiceStopper is a common interface for all services
type ServiceStopper interface {
	Stop()
}

func Wait(s ServiceStopper) {
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	sig := <-sigChan
	log.Printf("Caught signal %v: terminating\n", sig)
	s.Stop()
	os.Exit(0)
}
