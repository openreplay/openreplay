package tracer

import (
	"bytes"
	"encoding/json"
	"strings"
)

const hiddenValue = "HIDDEN"

var sensitiveKeys = []string{"password", "passphrase", "token", "secret", "apikey", "accesskey",
	"applicationkey", "querykey", "authheader", "authorization", "credential"}

func isSensitiveKey(key string) bool {
	var b strings.Builder
	for _, r := range strings.ToLower(key) {
		if r >= 'a' && r <= 'z' {
			b.WriteRune(r)
		}
	}
	normalized := b.String()
	for _, s := range sensitiveKeys {
		if strings.Contains(normalized, s) {
			return true
		}
	}
	return false
}

func redactValue(v any) any {
	switch val := v.(type) {
	case map[string]any:
		for k, inner := range val {
			if isSensitiveKey(k) {
				val[k] = hiddenValue
				continue
			}
			val[k] = redactValue(inner)
		}
	case []any:
		for i := range val {
			val[i] = redactValue(val[i])
		}
	}
	return v
}

func redactPayload(body []byte) []byte {
	if len(bytes.TrimSpace(body)) == 0 {
		return nil
	}
	dec := json.NewDecoder(bytes.NewReader(body))
	dec.UseNumber()
	var v any
	if err := dec.Decode(&v); err != nil {
		return nil
	}
	out, err := json.Marshal(redactValue(v))
	if err != nil {
		return nil
	}
	return out
}
