package assist

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha1"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"time"
)

var (
	ErrNoTurnSecret   = errors.New("secret not defined")
	ErrInvalidTurnTTL = errors.New("assist ttl must be positive")
)

type TurnCredentials struct {
	Username   string `json:"username"`
	Credential string `json:"credential"`
}

func NewTurnCredentials(secret string, ttlHours int, now time.Time) (*TurnCredentials, error) {
	if secret == "" {
		return nil, ErrNoTurnSecret
	}
	if ttlHours <= 0 {
		return nil, ErrInvalidTurnTTL
	}
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return nil, fmt.Errorf("generate salt: %s", err)
	}
	username := fmt.Sprintf("%d:%s", now.Unix()+int64(ttlHours)*3600, hex.EncodeToString(salt))
	mac := hmac.New(sha1.New, []byte(secret))
	mac.Write([]byte(username))
	return &TurnCredentials{
		Username:   username,
		Credential: base64.StdEncoding.EncodeToString(mac.Sum(nil)),
	}, nil
}
