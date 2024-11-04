package server

import (
	"context"
	"errors"
	"fmt"
	"golang.org/x/net/http2"
	"net/http"
	"time"
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
