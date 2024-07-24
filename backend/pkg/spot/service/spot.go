package service

import (
	"context"
	"encoding/json"
	"fmt"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/flakeid"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/spot/auth"
	"time"
)

type Spot struct {
	ID        uint64    `json:"id"`
	Name      string    `json:"name"`
	UserID    uint64    `json:"userID"`
	UserEmail string    `json:"userEmail"`
	TenantID  uint64    `json:"tenantID"`
	Duration  int       `json:"duration"`
	Crop      []int     `json:"crop"`
	Comments  []Comment `json:"comments"`
	CreatedAt time.Time `json:"createdAt"`
}

type Comment struct {
	UserName  string    `json:"user"`
	Text      string    `json:"text"`
	CreatedAt time.Time `json:"createdAt"`
}

type GetOpts struct {
	SpotID     uint64 // grab particular spot by ID
	UserID     uint64 // for filtering by user
	TenantID   uint64 // for filtering by all users in tenant
	NameFilter string // for filtering by name (substring)
	Order      string // sorting ("asc" or "desc")
	Limit      uint64 // pagination (limit for page)
	Offset     uint64 // pagination (offset for page)
	Page       uint64
}

type spotsImpl struct {
	log    logger.Logger
	pgconn pool.Pool
	flaker *flakeid.Flaker
}

type Update struct {
	ID         uint64   `json:"id"`
	NewName    string   `json:"newName"`
	NewComment *Comment `json:"newComment"`
}

type Spots interface {
	Add(user *auth.User, name, comment string, duration int, crop []int) (*Spot, error)
	GetByID(user *auth.User, spotID uint64) (*Spot, error)
	Get(user *auth.User, opts *GetOpts) ([]*Spot, uint64, error)
	UpdateName(user *auth.User, spotID uint64, newName string) (*Spot, error)
	AddComment(user *auth.User, spotID uint64, comment *Comment) (*Spot, error)
	Delete(user *auth.User, spotIds []uint64) error
}

func NewSpots(log logger.Logger, pgconn pool.Pool, flaker *flakeid.Flaker) Spots {
	return &spotsImpl{
		log:    log,
		pgconn: pgconn,
		flaker: flaker,
	}
}

func (s *spotsImpl) Add(user *auth.User, name, comment string, duration int, crop []int) (*Spot, error) {
	switch {
	case user == nil:
		return nil, fmt.Errorf("user is required")
	case name == "":
		return nil, fmt.Errorf("name is required")
	case duration <= 0:
		return nil, fmt.Errorf("duration should be greater than 0")
	}

	createdAt := time.Now()
	spotID, err := s.flaker.Compose(uint64(createdAt.UnixMilli()))
	if err != nil {
		return nil, err
	}
	newSpot := &Spot{
		ID:        spotID,
		Name:      name,
		UserID:    user.ID,
		UserEmail: user.Email,
		TenantID:  user.TenantID,
		Duration:  duration,
		Crop:      crop,
		CreatedAt: createdAt,
	}
	if comment != "" {
		newSpot.Comments = append(newSpot.Comments, Comment{
			UserName:  user.Name,
			Text:      comment,
			CreatedAt: createdAt,
		})
	}
	if err = s.add(newSpot); err != nil {
		return nil, err
	}
	return newSpot, nil
}

func (s *spotsImpl) encodeComment(comment *Comment) string {
	encodedComment, err := json.Marshal(comment)
	if err != nil {
		s.log.Warn(context.Background(), "failed to encode comment: %v, err: %s", comment, err)
		return ""
	}
	return string(encodedComment)
}

func (s *spotsImpl) add(spot *Spot) error {
	sql := `INSERT INTO spots (spot_id, name, user_id, user_email, tenant_id, duration, crop, comments, created_at) 
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`
	var comments []string
	for _, comment := range spot.Comments {
		if encodedComment := s.encodeComment(&comment); encodedComment != "" {
			comments = append(comments, encodedComment)
		}
	}
	err := s.pgconn.Exec(sql, spot.ID, spot.Name, spot.UserID, spot.UserEmail, spot.TenantID, spot.Duration, spot.Crop,
		comments, spot.CreatedAt)
	if err != nil {
		return err
	}
	return nil
}

func (s *spotsImpl) GetByID(user *auth.User, spotID uint64) (*Spot, error) {
	switch {
	case user == nil:
		return nil, fmt.Errorf("user is required")
	case spotID == 0:
		return nil, fmt.Errorf("spot id is required")
	}
	return s.getByID(spotID, user)
}

func (s *spotsImpl) getByID(spotID uint64, user *auth.User) (*Spot, error) {
	sql := `SELECT name, user_email, duration, crop, comments, created_at FROM spots 
            WHERE spot_id = $1 AND tenant_id = $2 AND deleted_at IS NULL`
	spot := &Spot{ID: spotID}
	var comments []string
	err := s.pgconn.QueryRow(sql, spotID, user.TenantID).Scan(&spot.Name, &spot.UserEmail, &spot.Duration, &spot.Crop,
		&comments, &spot.CreatedAt)
	if err != nil {
		return nil, err
	}
	for _, comment := range comments {
		var decodedComment Comment
		if err = json.Unmarshal([]byte(comment), &decodedComment); err != nil {
			s.log.Warn(context.Background(), "failed to decode comment: %s", err)
			continue
		}
		spot.Comments = append(spot.Comments, decodedComment)

	}
	return spot, nil
}

func (s *spotsImpl) Get(user *auth.User, opts *GetOpts) ([]*Spot, uint64, error) {
	switch {
	case user == nil:
		return nil, 0, fmt.Errorf("user is required")
	case opts == nil:
		return nil, 0, fmt.Errorf("get options are required")
	case user.TenantID == 0: // Tenant ID is required even for public get functions
		return nil, 0, fmt.Errorf("tenant id is required")
	}

	// Show the latest spots first by default
	if opts.Order != "asc" && opts.Order != "desc" {
		opts.Order = "desc"
	}
	if opts.Limit <= 0 || opts.Limit > 10 {
		opts.Limit = 9
	}
	if opts.Page < 1 {
		opts.Page = 1
	}
	opts.Offset = (opts.Page - 1) * opts.Limit
	return s.getAll(user, opts)
}

func (s *spotsImpl) getAll(user *auth.User, opts *GetOpts) ([]*Spot, uint64, error) {
	sql := `SELECT COUNT(1) OVER () AS total, spot_id, name, user_email, duration, created_at FROM spots 
			WHERE tenant_id = $1 AND deleted_at IS NULL`
	args := []interface{}{user.TenantID}
	if opts.UserID != 0 {
		sql += ` AND user_id = ` + fmt.Sprintf("$%d", len(args)+1)
		args = append(args, opts.UserID)
	}
	if opts.NameFilter != "" {
		sql += ` AND name ILIKE ` + fmt.Sprintf("$%d", len(args)+1)
		args = append(args, "%"+opts.NameFilter+"%")
	}
	if opts.Order != "" {
		sql += ` ORDER BY created_at ` + opts.Order
	}
	if opts.Limit != 0 {
		sql += ` LIMIT ` + fmt.Sprintf("$%d", len(args)+1)
		args = append(args, opts.Limit)
	}
	if opts.Offset != 0 {
		sql += ` OFFSET ` + fmt.Sprintf("$%d", len(args)+1)
		args = append(args, opts.Offset)
	}
	//s.log.Info(context.Background(), "sql: %s, args: %v", sql, args)
	rows, err := s.pgconn.Query(sql, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var total uint64
	var spots []*Spot
	for rows.Next() {
		spot := &Spot{}
		if err = rows.Scan(&total, &spot.ID, &spot.Name, &spot.UserEmail, &spot.Duration, &spot.CreatedAt); err != nil {
			return nil, 0, err
		}
		spots = append(spots, spot)
	}
	return spots, total, nil
}

func (s *spotsImpl) UpdateName(user *auth.User, spotID uint64, newName string) (*Spot, error) {
	switch {
	case user == nil:
		return nil, fmt.Errorf("user is required")
	case spotID == 0:
		return nil, fmt.Errorf("spot id is required")
	case newName == "":
		return nil, fmt.Errorf("new name is required")
	}
	return s.updateName(spotID, newName, user)
}

func (s *spotsImpl) updateName(spotID uint64, newName string, user *auth.User) (*Spot, error) {
	sql := `WITH updated AS (
		UPDATE spots SET name = $1, updated_at = $2 
		WHERE spot_id = $3 AND tenant_id = $4 AND deleted_at IS NULL RETURNING *)
		SELECT COUNT(*) FROM updated`
	updated := 0
	if err := s.pgconn.QueryRow(sql, newName, time.Now(), spotID, user.TenantID).Scan(&updated); err != nil {
		return nil, err
	}
	if updated == 0 {
		return nil, fmt.Errorf("not allowed to update name")
	}
	return &Spot{ID: spotID, Name: newName}, nil
}

func (s *spotsImpl) AddComment(user *auth.User, spotID uint64, comment *Comment) (*Spot, error) {
	switch {
	case user == nil:
		return nil, fmt.Errorf("user is required")
	case spotID == 0:
		return nil, fmt.Errorf("spot id is required")
	case comment == nil:
		return nil, fmt.Errorf("comment is required")
	case comment.UserName == "":
		return nil, fmt.Errorf("user name is required")
	case comment.Text == "":
		return nil, fmt.Errorf("comment text is required")
	}
	if len(comment.Text) > 120 {
		comment.Text = comment.Text[:120]
	}
	comment.CreatedAt = time.Now()
	return s.addComment(spotID, comment, user)
}

func (s *spotsImpl) addComment(spotID uint64, newComment *Comment, user *auth.User) (*Spot, error) {
	sql := `WITH updated AS (
		UPDATE spots SET comments = array_append(comments, $1), updated_at = $2 
		WHERE spot_id = $3 AND tenant_id = $4 AND deleted_at IS NULL RETURNING *)
		SELECT COUNT(*) FROM updated`
	encodedComment := s.encodeComment(newComment)
	if encodedComment == "" {
		return nil, fmt.Errorf("failed to encode comment")
	}
	updated := 0
	if err := s.pgconn.QueryRow(sql, encodedComment, time.Now(), spotID, user.TenantID).Scan(&updated); err != nil {
		return nil, err
	}
	if updated == 0 {
		return nil, fmt.Errorf("not allowed to add comment")
	}
	return &Spot{ID: spotID}, nil
}

func (s *spotsImpl) Delete(user *auth.User, spotIds []uint64) error {
	switch {
	case user == nil:
		return fmt.Errorf("user is required")
	case len(spotIds) == 0:
		return fmt.Errorf("spot ids are required")
	}
	return s.deleteSpots(spotIds, user)
}

func (s *spotsImpl) deleteSpots(spotIds []uint64, user *auth.User) error {
	sql := `WITH updated AS (UPDATE spots SET deleted_at = NOW() WHERE tenant_id = $1 AND spot_id IN (`
	args := []interface{}{user.TenantID}
	for i, spotID := range spotIds {
		sql += fmt.Sprintf("$%d,", i+2)
		args = append(args, spotID)
	}
	sql = sql[:len(sql)-1] + `) RETURNING *) SELECT COUNT(*) FROM updated`
	count := 0
	if err := s.pgconn.QueryRow(sql, args...).Scan(&count); err != nil {
		return err
	}
	if count == 0 {
		return fmt.Errorf("not allowed to delete spots")
	}
	if count != len(spotIds) {
		s.log.Warn(context.Background(), "deleted %d spots, but expected to delete %d", count, len(spotIds))
		return fmt.Errorf("failed to delete all requested spots")
	}
	return nil
}
