package trails

import (
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"
)

const (
	defaultLimit = 200
	maxLimit     = 10000
)

type SearchRequest struct {
	Limit     *int    `json:"limit"`
	Page      *int    `json:"page"`
	StartDate *int64  `json:"startDate"`
	EndDate   *int64  `json:"endDate"`
	UserID    *int64  `json:"userId"`
	Query     *string `json:"query"`
	Action    *string `json:"action"`
	Order     *string `json:"order"`
}

type searchParams struct {
	limit     int
	offset    int
	startDate int64
	endDate   int64
	userID    *int64
	query     string
	action    string
	order     string
}

func (r *SearchRequest) params(now time.Time) (*searchParams, error) {
	p := &searchParams{
		limit:     defaultLimit,
		startDate: now.AddDate(0, 0, -7).UnixMilli(),
		endDate:   now.AddDate(0, 0, 1).UnixMilli(),
		userID:    r.UserID,
		order:     "DESC",
	}
	if r.Limit != nil {
		if *r.Limit <= 0 || *r.Limit > maxLimit {
			return nil, fmt.Errorf("limit must be between 1 and %d", maxLimit)
		}
		p.limit = *r.Limit
	}
	page := 1
	if r.Page != nil {
		if *r.Page <= 0 {
			return nil, errors.New("page must be greater than 0")
		}
		page = *r.Page
	}
	if page-1 > math.MaxInt32/p.limit {
		return nil, errors.New("page is too large")
	}
	p.offset = (page - 1) * p.limit
	if r.StartDate != nil {
		p.startDate = *r.StartDate
	}
	if r.EndDate != nil {
		p.endDate = *r.EndDate
	}
	if r.Query != nil {
		p.query = strings.TrimSpace(*r.Query)
	}
	if r.Action != nil {
		p.action = *r.Action
	}
	if r.Order != nil && *r.Order != "" {
		p.order = strings.ToUpper(*r.Order)
		if p.order != "ASC" && p.order != "DESC" {
			return nil, errors.New("order must be asc or desc")
		}
	}
	return p, nil
}

type Trail struct {
	UserID     *int64          `json:"userId"`
	TenantID   int64           `json:"tenantId"`
	CreatedAt  int64           `json:"createdAt"`
	Auth       *string         `json:"auth"`
	Action     string          `json:"action"`
	Method     string          `json:"method"`
	PathFormat string          `json:"pathFormat"`
	Endpoint   string          `json:"endpoint"`
	Payload    json.RawMessage `json:"payload"`
	Parameters json.RawMessage `json:"parameters"`
	Status     *int            `json:"status"`
	Email      *string         `json:"email"`
	Username   *string         `json:"username"`
	Rn         int64           `json:"rn"`
}

type SearchResponse struct {
	Count    int64    `json:"count"`
	Sessions []*Trail `json:"sessions"`
}
