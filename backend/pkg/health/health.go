package health

import (
	"context"
	"encoding/json"
	"net/http"
	"sync"
	"time"
)

type Checker func(ctx context.Context) error

type Health struct {
	mu       sync.RWMutex
	checkers []namedChecker
}

type namedChecker struct {
	name    string
	checker Checker
}

type checkResult struct {
	Status string `json:"status"`
	Output string `json:"output,omitempty"`
	Time   string `json:"time,omitempty"`
}

type healthResponse struct {
	Status string                   `json:"status"`
	Checks map[string][]checkResult `json:"checks,omitempty"`
}

func New() *Health {
	h := &Health{}
	http.HandleFunc("/health", h.handler)
	return h
}

func (h *Health) Register(name string, checker Checker) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.checkers = append(h.checkers, namedChecker{name: name, checker: checker})
}

func (h *Health) handler(w http.ResponseWriter, r *http.Request) {
	h.mu.RLock()
	checkers := make([]namedChecker, len(h.checkers))
	copy(checkers, h.checkers)
	h.mu.RUnlock()

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	resp := healthResponse{
		Status: "pass",
	}

	if len(checkers) == 0 {
		writeJSON(w, http.StatusOK, resp)
		return
	}

	resp.Checks = make(map[string][]checkResult)

	type result struct {
		name string
		err  error
		dur  time.Duration
	}

	results := make(chan result, len(checkers))
	for _, nc := range checkers {
		go func(nc namedChecker) {
			start := time.Now()
			err := nc.checker(ctx)
			results <- result{name: nc.name, err: err, dur: time.Since(start)}
		}(nc)
	}

	ready := true
	for i := 0; i < len(checkers); i++ {
		res := <-results
		if res.err != nil {
			ready = false
			resp.Checks[res.name] = []checkResult{{
				Status: "fail",
				Output: truncate(res.err.Error(), 200),
				Time:   res.dur.String(),
			}}
		} else {
			resp.Checks[res.name] = []checkResult{{
				Status: "pass",
				Time:   res.dur.String(),
			}}
		}
	}

	if !ready {
		resp.Status = "fail"
		writeJSON(w, http.StatusServiceUnavailable, resp)
		return
	}

	writeJSON(w, http.StatusOK, resp)
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/health+json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}
