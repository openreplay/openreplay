package notes

import "time"

type Note struct {
	ID        uint64    `json:"noteId"`
	Message   string    `json:"message"`
	Tag       *string   `json:"tag"`
	Timestamp int64     `json:"timestamp"`
	CreatedAt time.Time `json:"createdAt"`
	SessionID uint64    `json:"sessionId"`
	IsPublic  bool      `json:"isPublic"`
	Thumbnail *string   `json:"thumbnail"`
	StartAt   *uint64   `json:"startAt"`
	EndAt     *uint64   `json:"endAt"`
	UserName  string    `json:"userName"`
	ShareName string    `json:"-"`
}

type NoteUpdate struct {
	Message   *string `json:"message"`
	Tag       *string `json:"tag"`
	IsPublic  *bool   `json:"is_public"`
	Timestamp *uint64 `json:"timestamp"`
}

type GetOpts struct {
	Page       int      `json:"page"`
	Limit      int      `json:"limit"`
	Sort       string   `json:"sort"`       // createdAt, do we have other options?
	Order      string   `json:"order"`      // DESC, do we have ASC?
	Tags       []string `json:"tags"`       // e.g. ["ISSUE", "DESIGN", "NOTE"], no == ALL
	MineOnly   bool     `json:"mineOnly"`   // true, false
	SharedOnly bool     `json:"sharedOnly"` // true, false
	Search     string   `json:"search"`
}
