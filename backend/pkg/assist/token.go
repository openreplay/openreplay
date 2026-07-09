package assist

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"openreplay/backend/internal/config/api"
)

// agentToken builds the JWT the frontend agent uses to join a live session,
// the same way for both editions.
func agentToken(cfg *api.Config, projectID uint32, projectKey string, sessionID uint64) (string, error) {
	var method jwt.SigningMethod
	switch cfg.AssistJwtAlgorithm {
	case "HS256":
		method = jwt.SigningMethodHS256
	case "HS384":
		method = jwt.SigningMethodHS384
	case "HS512":
		method = jwt.SigningMethodHS512
	default:
		return "", errors.New("unsupported JWT_ALGORITHM: " + cfg.AssistJwtAlgorithm)
	}

	// iat in seconds since epoch (UTC), like iat // 1000 in Python
	iat := time.Now().UTC().Unix()
	// local UTC offset in seconds (TimeUTC.get_utc_offset() // 1000 in Python)
	_, offsetSeconds := time.Now().Zone()
	exp := iat + cfg.AssistJwtExpiration + int64(offsetSeconds)

	claims := jwt.MapClaims{
		"projectKey": projectKey,
		"projectId":  projectID,
		"sessionId":  fmt.Sprintf("%d", sessionID),
		"iat":        iat,
		"exp":        exp,
		"iss":        cfg.AssistJwtIssuer,
		"aud":        "openreplay:agent",
	}

	token := jwt.NewWithClaims(method, claims)
	signed, err := token.SignedString([]byte(cfg.AssistJwtSecret))
	if err != nil {
		return "", err
	}
	return signed, nil
}
