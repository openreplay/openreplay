package clickhouse

import (
	"openreplay/backend/pkg/db/types"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/sessions"
)

type Connector interface {
	Prepare() error
	Commit() error
	Stop() error
	InsertWebSession(session *sessions.Session) error
	InsertWebResourceEvent(session *sessions.Session, msg *messages.ResourceTiming) error
	InsertWebPageEvent(session *sessions.Session, msg *messages.PageEvent) error
	InsertWebClickEvent(session *sessions.Session, msg *messages.MouseClick) error
	InsertWebInputEvent(session *sessions.Session, msg *messages.InputEvent) error
	InsertWebErrorEvent(session *sessions.Session, msg *types.ErrorEvent) error
	InsertWebPerformanceTrackAggr(session *sessions.Session, msg *messages.PerformanceTrackAggr) error
	InsertAutocomplete(session *sessions.Session, msgType, msgValue string) error
	InsertRequest(session *sessions.Session, msg *messages.NetworkRequest, savePayload bool) error
	InsertCustom(session *sessions.Session, msg *messages.CustomEvent) error
	InsertGraphQL(session *sessions.Session, msg *messages.GraphQL) error
	InsertIssue(session *sessions.Session, msg *messages.IssueEvent) error
}
