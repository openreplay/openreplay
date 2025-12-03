package server

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"golang.org/x/net/http2"

	"openreplay/backend/internal/config/common"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/server/api"
)

type Server struct {
	server *http.Server
}

func New(handler http.Handler, host, port string, timeout time.Duration) (*Server, error) {
	switch {
	case port == "":
		return nil, errors.New("empty server port")
	case handler == nil:
		return nil, errors.New("empty handler")
	case timeout < 1:
		return nil, fmt.Errorf("invalid timeout %d", timeout)
	}
	server := &http.Server{
		Addr:         fmt.Sprintf("%s:%s", host, port),
		Handler:      handler,
		ReadTimeout:  timeout,
		WriteTimeout: timeout,
	}
	if err := http2.ConfigureServer(server, nil); err != nil {
		return nil, fmt.Errorf("error configuring server: %s", err)
	}
	return &Server{
		server: server,
	}, nil
}

func (s *Server) Start() error {
	return s.server.ListenAndServe()
}

func (s *Server) Stop() {
	if err := s.server.Shutdown(context.Background()); err != nil {
		fmt.Printf("error shutting down server: %s\n", err)
	}
}

func Run(ctx context.Context, log logger.Logger, cfg *common.HTTP, router api.Router) {
	webServer, err := New(router.Get(), cfg.HTTPHost, cfg.HTTPPort, cfg.HTTPTimeout)
	if err != nil {
		log.Fatal(ctx, "failed while creating server: %s", err)
	}
	go func() {
		if err := webServer.Start(); err != nil {
			log.Fatal(ctx, "http server error: %s", err)
		}
	}()
	log.Info(ctx, "server successfully started on port %s", cfg.HTTPPort)

	// Wait stop signal to shut down server gracefully
	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)
	<-sigchan
	log.Info(ctx, "shutting down the server")
	webServer.Stop()
}
