package token

import (
	"crypto/hmac"
	"crypto/sha256"
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/btcsuite/btcutil/base58"
)

var EXPIRED = errors.New("token expired")

type Tokenizer struct {
	secret []byte
}

func NewTokenizer(secret string) *Tokenizer {
	return &Tokenizer{[]byte(secret)}
}

type TokenData struct {
	ID      uint64
	ExpTime int64
}

func (tokenizer *Tokenizer) sign(body string) []byte {
	mac := hmac.New(sha256.New, tokenizer.secret)
	mac.Write([]byte(body))
	return mac.Sum(nil)
}

func (tokenizer *Tokenizer) Compose(d TokenData) string {
	body := strconv.FormatUint(d.ID, 36) +
		"." + strconv.FormatInt(d.ExpTime, 36)
	sign := base58.Encode(tokenizer.sign(body))
	return body + "." + sign
}

func (tokenizer *Tokenizer) Parse(token string) (*TokenData, error) {
	data := strings.Split(token, ".")
	if len(data) != 3 {
		return nil, errors.New("wrong token format")
	}
	if !hmac.Equal(
		base58.Decode(data[len(data)-1]),
		tokenizer.sign(data[0]+"."+data[1]),
	) {
		return nil, errors.New("wrong token sign")
	}
	id, err := strconv.ParseUint(data[0], 36, 64)
	if err != nil {
		return nil, err
	}
	expTime, err := strconv.ParseInt(data[1], 36, 64)
	if err != nil {
		return nil, err
	}
	if expTime <= time.Now().UnixMilli() {
		return &TokenData{id, expTime}, EXPIRED
	}
	return &TokenData{id, expTime}, nil
}
