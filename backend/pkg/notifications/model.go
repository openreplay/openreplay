package notifications

import (
	"encoding/json"
	"errors"
	"fmt"
	"math"
)

type Notification struct {
	NotificationID int             `json:"notificationId"`
	UserID         *int            `json:"userId"`
	Title          string          `json:"title"`
	Description    string          `json:"description"`
	ButtonText     *string         `json:"buttonText"`
	ButtonURL      *string         `json:"buttonUrl"`
	ImageURL       *string         `json:"imageUrl"`
	CreatedAt      int64           `json:"createdAt"`
	Options        json.RawMessage `json:"options"`
	Viewed         bool            `json:"viewed"`
}

type Count struct {
	Count int `json:"count"`
}

type ViewRequest struct {
	IDs            []int  `json:"ids"`
	StartTimestamp *int64 `json:"startTimestamp"`
	EndTimestamp   *int64 `json:"endTimestamp"`
	StartDate      *int64 `json:"startDate"`
	EndDate        *int64 `json:"endDate"`
}

func (r *ViewRequest) Normalize() error {
	if r.StartTimestamp == nil {
		r.StartTimestamp = r.StartDate
	}
	if r.EndTimestamp == nil {
		r.EndTimestamp = r.EndDate
	}
	if r.StartTimestamp != nil && *r.StartTimestamp < 0 {
		return errors.New("startTimestamp must be greater or equal to 0")
	}
	if r.EndTimestamp != nil && *r.EndTimestamp < 0 {
		return errors.New("endTimestamp must be greater or equal to 0")
	}
	if r.StartTimestamp != nil && r.EndTimestamp != nil && *r.StartTimestamp > *r.EndTimestamp {
		return errors.New("endTimestamp must be greater or equal to startTimestamp")
	}
	for _, id := range r.IDs {
		if id < math.MinInt32 || id > math.MaxInt32 {
			return fmt.Errorf("invalid notification id: %d", id)
		}
	}
	return nil
}
