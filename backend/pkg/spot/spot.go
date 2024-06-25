package spot

import (
	"context"
	"encoding/json"
	"fmt"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/flakeid"
	"openreplay/backend/pkg/logger"
	"time"
)

type Spot struct {
	ID        uint64    `json:"id"`
	Name      string    `json:"name"`
	UserID    uint64    `json:"userID"`
	TenantID  uint64    `json:"tenantID"`
	Duration  int       `json:"duration"`
	Comments  []Comment `json:"comments"`
	Key       *Key      `json:"key"`
	CreatedAt time.Time `json:"createdAt"`
}

type Comment struct {
	UserName  string    `json:"user"`
	Text      string    `json:"text"`
	CreatedAt time.Time `json:"createdAt"`
}

type Key struct {
	Value      string    `json:"value"`
	Expiration uint64    `json:"expiration"`
	ExpiredAt  time.Time `json:"expiredAt"`
}

type GetOpts struct {
	SpotID     uint64 // grab particular spot by ID
	UserID     uint64 // for filtering by user
	TenantID   uint64 // for filtering by all users in tenant
	NameFilter string // for filtering by name (substring)
	Order      string // sorting ("asc" or "desc")
	Limit      int    // pagination (limit for page)
	Offset     int    // pagination (offset for page)
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
	Add(user *User, name, comment string, duration int) (*Spot, error)
	Get(user *User, opts *GetOpts) ([]*Spot, error)
	Update(user *User, update *Update) (*Spot, error)
	Delete(user *User, spotIds []uint64) error
}

func NewSpots(log logger.Logger, pgconn pool.Pool, flaker *flakeid.Flaker) Spots {
	return &spotsImpl{
		log:    log,
		pgconn: pgconn,
		flaker: flaker,
	}
}

func (s *spotsImpl) Add(user *User, name, comment string, duration int) (*Spot, error) {
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
		TenantID:  user.TenantID,
		Duration:  duration,
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
	sql := `INSERT INTO spots (spot_id, name, user_id, tenant_id, duration, comments, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)`
	var comments []string
	for _, comment := range spot.Comments {
		if encodedComment := s.encodeComment(&comment); encodedComment != "" {
			comments = append(comments, encodedComment)
		}
	}
	err := s.pgconn.Exec(sql, spot.ID, spot.Name, spot.UserID, spot.TenantID, spot.Duration, comments, spot.CreatedAt)
	if err != nil {
		return err
	}
	return nil
}

func (s *spotsImpl) Get(user *User, opts *GetOpts) ([]*Spot, error) {
	switch {
	case user == nil:
		return nil, fmt.Errorf("user is required")
	case opts == nil:
		return nil, fmt.Errorf("get options are required")
	case user.TenantID == 0: // Tenant ID is required even for public get functions
		return nil, fmt.Errorf("tenant id is required")
	}

	// Get particular spot by ID
	if opts.SpotID != 0 {
		res, err := s.getByID(opts.SpotID, user)
		if err != nil {
			return nil, err
		}
		return []*Spot{res}, nil
	}

	// Prepare options
	if opts.Limit <= 0 || opts.Limit > 10 {
		opts.Limit = 9
	}
	// Show the latest spots first
	if opts.Order != "asc" && opts.Order != "desc" {
		opts.Order = "desc"
	}
	// Get a list of spots
	return s.getAll(user, opts)
}

func (s *spotsImpl) getByID(spotID uint64, user *User) (*Spot, error) {
	sql := `SELECT name, user_id, duration, comments, created_at FROM spots 
            WHERE spot_id = $1 AND tenant_id = $2 AND deleted_at IS NULL`
	spot := &Spot{}
	var comments []string
	err := s.pgconn.QueryRow(sql, spotID, user.TenantID).Scan(&spot.Name, &spot.UserID, &spot.Duration, &comments, &spot.CreatedAt)
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

func (s *spotsImpl) getAll(user *User, opts *GetOpts) ([]*Spot, error) {
	sql := `SELECT spot_id, name, user_id, duration, created_at FROM spots WHERE tenant_id = $1 AND deleted_at IS NULL`
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
	s.log.Info(context.Background(), "sql: %s, args: %v", sql, args)
	rows, err := s.pgconn.Query(sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var spots []*Spot
	for rows.Next() {
		spot := &Spot{}
		if err = rows.Scan(&spot.ID, &spot.Name, &spot.UserID, &spot.Duration, &spot.CreatedAt); err != nil {
			return nil, err
		}
		spots = append(spots, spot)
	}
	return spots, nil
}

func (s *spotsImpl) Update(user *User, update *Update) (*Spot, error) {
	switch {
	case user == nil:
		return nil, fmt.Errorf("user is required")
	case update == nil:
		return nil, fmt.Errorf("update is required")
	case update.ID == 0:
		return nil, fmt.Errorf("spot id is required")
	}
	if update.NewName != "" {
		return s.updateName(update.ID, update.NewName, user)
	}
	if update.NewComment != nil {
		update.NewComment.CreatedAt = time.Now()
		return s.addComment(update.ID, update.NewComment, user)
	}
	return nil, fmt.Errorf("nothing to update")
}

func (s *spotsImpl) updateName(spotID uint64, newName string, user *User) (*Spot, error) {
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
	return &Spot{ID: spotID, Name: newName}, nil // TODO: return updated spot
}

func (s *spotsImpl) addComment(spotID uint64, newComment *Comment, user *User) (*Spot, error) {
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
	return &Spot{ID: spotID}, nil // TODO: return updated spot
}

func (s *spotsImpl) Delete(user *User, spotIds []uint64) error {
	switch {
	case user == nil:
		return fmt.Errorf("user is required")
	case len(spotIds) == 0:
		return fmt.Errorf("spot ids are required")
	}
	return s.deleteSpots(spotIds, user)
}

func (s *spotsImpl) deleteSpots(spotIds []uint64, user *User) error {
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
