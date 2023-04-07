package server

import (
	"context"
	"errors"
	"fmt"
	"golang.org/x/net/http2"
	"log"
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
		log.Printf("can't configure http server: %s", err)
	}
	return &Server{
		server: server,
	}, nil
}

func (s *Server) Start() error {
	return s.server.ListenAndServe()
}

func (s *Server) Stop() {
	s.server.Shutdown(context.Background())
}
