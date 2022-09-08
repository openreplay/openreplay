package sessions

import (
	"openreplay/backend/pkg/messages"
)

type Sessions interface {
	InsertSession(sessionID uint64, s *messages.SessionStart) error
	HandleSessionStart(sessionID uint64, s *messages.SessionStart) error
	InsertSessionEnd(sessionID uint64, e *messages.SessionEnd) error
	HandleSessionEnd(sessionID uint64, e *messages.SessionEnd) error
	InsertUnStartedSession(s *UnstartedSession) error
	InsertReferrer(sessionID uint64, referrer string) error
	InsertUserID(sessionID uint64, userID *messages.UserID) error
	InsertAnonymousUserID(sessionID uint64, userAnonymousID *messages.UserAnonymousID) error
	InsertMetadata(sessionID uint64, metadata *messages.Metadata) error
	GetProjectByKey(projectKey string) (*Project, error)
}
