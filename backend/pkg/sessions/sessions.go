package sessions

import (
	"openreplay/backend/pkg/messages"
)

type Sessions interface {
	InsertSession(msg *messages.SessionStart) error
	HandleSessionStart(msg *messages.SessionStart) error
	InsertSessionEnd(msg *messages.SessionEnd) error
	HandleSessionEnd(msg *messages.SessionEnd) error
	InsertReferrer(sessionID uint64, referrer string) error
	InsertUserID(userID *messages.UserID) error
	InsertAnonymousUserID(userAnonymousID *messages.UserAnonymousID) error
	InsertMetadata(msg *messages.Metadata) error
	InsertUnStartedSession(s *UnstartedSession) error
	GetProjectByKey(projectKey string) (*Project, error)
}
