package token

import (
	"errors"
	"net/http"
	"strings"
)

const BEARER_SCHEMA = "Bearer "

func (tokenizer *Tokenizer) ParseFromHTTPRequest(r *http.Request) (*TokenData, error) {
	header := r.Header.Get("Authorization")
	if !strings.HasPrefix(header, BEARER_SCHEMA) {
		return nil, errors.New("Missing token")
	}
	token := header[len(BEARER_SCHEMA):]
	return tokenizer.Parse(token)
}
