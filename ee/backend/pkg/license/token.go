package license

import (
	"crypto/ed25519"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"errors"
	"fmt"
	"strings"
	"time"
)

const (
	TokenPrefix    = "OR1"
	WarnBeforeDays = 14
	MaxClockSkew   = 24 * time.Hour
)

// publicKeys maps kid -> PEM encoded Ed25519 public key
var publicKeys = map[string]string{
	"25d36fbe": `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAbP4b2Or2Xll/XHEbGvvYRhef22OnXaXXkfufbPHcuNI=
-----END PUBLIC KEY-----`,
}

type Payload struct {
	Kid       string `json:"kid"`
	Customer  string `json:"customer"`
	Seats     *int   `json:"seats"`
	IssuedAt  *int64 `json:"issued_at"`
	ExpiresAt *int64 `json:"expires_at"`
	GraceDays *int   `json:"grace_days"`
}

type License struct {
	Kid       string
	Customer  string
	Seats     int
	IssuedAt  time.Time
	ExpiresAt time.Time
	GraceDays int
}

func (l License) HardExpiresAt() time.Time {
	return l.ExpiresAt.Add(time.Duration(l.GraceDays) * time.Hour * 24)
}

func (l License) DaysLeft(now time.Time) int {
	secs := l.ExpiresAt.Unix() - now.Unix()
	days := secs / 86400
	if secs < 0 && secs%86400 != 0 {
		days--
	}
	return int(days)
}

func IsToken(s string) bool {
	return strings.HasPrefix(s, TokenPrefix+".")
}

func ParsePublicKey(pemStr string) (ed25519.PublicKey, error) {
	block, _ := pem.Decode([]byte(pemStr))
	if block == nil || block.Type != "PUBLIC KEY" {
		return nil, errors.New("not a PEM public key")
	}
	key, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		return nil, err
	}
	pub, ok := key.(ed25519.PublicKey)
	if !ok {
		return nil, errors.New("not an Ed25519 public key")
	}
	return pub, nil
}

func Parse(token string, keys map[string]string) (*License, error) {
	if !IsToken(token) {
		return nil, errors.New("not a license token")
	}
	parts := strings.Split(strings.TrimSpace(token), ".")
	if len(parts) != 3 {
		return nil, errors.New("malformed token")
	}
	payloadRaw, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, fmt.Errorf("malformed base64: %v", err)
	}
	signature, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil {
		return nil, fmt.Errorf("malformed base64: %v", err)
	}

	var p Payload
	if err := json.Unmarshal(payloadRaw, &p); err != nil {
		return nil, fmt.Errorf("malformed payload: %v", err)
	}
	pubPEM, ok := keys[p.Kid]
	if p.Kid == "" || !ok {
		return nil, fmt.Errorf("unknown signing key: %q", p.Kid)
	}
	pub, err := ParsePublicKey(pubPEM)
	if err != nil {
		return nil, fmt.Errorf("invalid public key for %s: %v", p.Kid, err)
	}
	if len(signature) != ed25519.SignatureSize || !ed25519.Verify(pub, payloadRaw, signature) {
		return nil, errors.New("invalid signature")
	}

	if p.IssuedAt == nil || *p.IssuedAt < 0 {
		return nil, errors.New("missing or invalid field: issued_at")
	}
	if p.ExpiresAt == nil || *p.ExpiresAt < 0 {
		return nil, errors.New("missing or invalid field: expires_at")
	}
	if *p.ExpiresAt <= *p.IssuedAt {
		return nil, errors.New("expires_at must be after issued_at")
	}
	if p.Seats == nil || *p.Seats < 0 {
		return nil, errors.New("missing or invalid field: seats")
	}
	grace := 0
	if p.GraceDays != nil {
		if *p.GraceDays < 0 {
			return nil, errors.New("missing or invalid field: grace_days")
		}
		grace = *p.GraceDays
	}
	return &License{
		Kid:       p.Kid,
		Customer:  p.Customer,
		Seats:     *p.Seats,
		IssuedAt:  time.Unix(*p.IssuedAt, 0).UTC(),
		ExpiresAt: time.Unix(*p.ExpiresAt, 0).UTC(),
		GraceDays: grace,
	}, nil
}

func Verify(token string, now time.Time, keys map[string]string) (*License, error) {
	lic, err := Parse(token, keys)
	if err != nil {
		return nil, err
	}
	if lic.IssuedAt.After(now.Add(MaxClockSkew)) {
		return nil, errors.New("license issued in the future, check the system clock")
	}
	if now.After(lic.HardExpiresAt()) {
		return nil, fmt.Errorf("license expired on %s", lic.HardExpiresAt().Format("2006-01-02"))
	}
	return lic, nil
}
