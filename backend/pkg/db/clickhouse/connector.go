package clickhouse

import (
	"openreplay/backend/pkg/db/types"
	"openreplay/backend/pkg/messages"
)

type Connector interface {
	Prepare() error
	Commit() error
	Stop() error
	InsertWebSession(session *types.Session) error
	InsertWebResourceEvent(session *types.Session, msg *messages.ResourceTiming) error
	InsertWebPageEvent(session *types.Session, msg *messages.PageEvent) error
	InsertWebClickEvent(session *types.Session, msg *messages.MouseClick) error
	InsertWebInputEvent(session *types.Session, msg *messages.InputEvent) error
	InsertWebErrorEvent(session *types.Session, msg *types.ErrorEvent) error
	InsertWebPerformanceTrackAggr(session *types.Session, msg *messages.PerformanceTrackAggr) error
	InsertAutocomplete(session *types.Session, msgType, msgValue string) error
	InsertRequest(session *types.Session, msg *messages.NetworkRequest, savePayload bool) error
	InsertCustom(session *types.Session, msg *messages.CustomEvent) error
	InsertGraphQL(session *types.Session, msg *messages.GraphQL) error
	InsertIssue(session *types.Session, msg *messages.IssueEvent) error
}
