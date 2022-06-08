package clickhouse

import (
	"errors"

	. "openreplay/backend/pkg/db/types"
	"openreplay/backend/pkg/hashid"
	. "openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/url"
)

func (conn *Connector) InsertWebSession(session *Session) error {
	if session.Duration == nil {
		return errors.New("Clickhouse: trying to insert session with ")
	}

	if err := conn.sessions.exec(
		session.SessionID,
		session.ProjectID,
		session.TrackerVersion,
		nullableString(session.RevID),
		session.UserUUID,
		session.UserOS,
		nullableString(session.UserOSVersion),
		nullableString(session.UserDevice),
		session.UserDeviceType,
		session.UserCountry,
		datetime(session.Timestamp),
		uint32(*session.Duration),
		session.PagesCount,
		session.EventsCount,
		session.ErrorsCount,
		// Web unique columns
		session.UserBrowser,
		nullableString(session.UserBrowserVersion),
	); err != nil {
		return err
	}
	// TODO: join sessions, sessions_metadata & sessions_ios
	return conn.metadata.exec(
		session.SessionID,
		session.UserID,
		session.UserAnonymousID,
		session.Metadata1,
		session.Metadata2,
		session.Metadata3,
		session.Metadata4,
		session.Metadata5,
		session.Metadata6,
		session.Metadata7,
		session.Metadata8,
		session.Metadata9,
		session.Metadata10,
		datetime(session.Timestamp),
	)
}

func (conn *Connector) InsertWebResourceEvent(session *Session, msg *ResourceEvent) error {
	// nullableString causes error  "unexpected type *string" on Nullable Enum type
	// (apparently, a clickhouse-go bug) https://github.com/ClickHouse/clickhouse-go/pull/204
	var method interface{} = url.EnsureMethod(msg.Method)
	if method == "" {
		method = nil
	}
	return conn.resources.exec(
		session.SessionID,
		session.ProjectID,
		session.TrackerVersion,
		nullableString(session.RevID),
		session.UserUUID,
		session.UserOS,
		nullableString(session.UserOSVersion),
		session.UserBrowser,
		nullableString(session.UserBrowserVersion),
		nullableString(session.UserDevice),
		session.UserDeviceType,
		session.UserCountry,
		datetime(msg.Timestamp),
		url.DiscardURLQuery(msg.URL),
		msg.Type,
		nullableUint16(uint16(msg.Duration)),
		nullableUint16(uint16(msg.TTFB)),
		nullableUint16(uint16(msg.HeaderSize)),
		nullableUint32(uint32(msg.EncodedBodySize)),
		nullableUint32(uint32(msg.DecodedBodySize)),
		msg.Success,
	)
}

func (conn *Connector) InsertWebPageEvent(session *Session, msg *PageEvent) error {
	return conn.pages.exec(
		session.SessionID,
		session.ProjectID,
		session.TrackerVersion, nullableString(session.RevID),
		session.UserUUID,
		session.UserOS,
		nullableString(session.UserOSVersion),
		session.UserBrowser,
		nullableString(session.UserBrowserVersion),
		nullableString(session.UserDevice),
		session.UserDeviceType,
		session.UserCountry,
		datetime(msg.Timestamp),
		url.DiscardURLQuery(msg.URL),
		nullableUint16(uint16(msg.RequestStart)),
		nullableUint16(uint16(msg.ResponseStart)),
		nullableUint16(uint16(msg.ResponseEnd)),
		nullableUint16(uint16(msg.DomContentLoadedEventStart)),
		nullableUint16(uint16(msg.DomContentLoadedEventEnd)),
		nullableUint16(uint16(msg.LoadEventStart)),
		nullableUint16(uint16(msg.LoadEventEnd)),
		nullableUint16(uint16(msg.FirstPaint)),
		nullableUint16(uint16(msg.FirstContentfulPaint)),
		nullableUint16(uint16(msg.SpeedIndex)),
		nullableUint16(uint16(msg.VisuallyComplete)),
		nullableUint16(uint16(msg.TimeToInteractive)),
	)
}

func (conn *Connector) InsertWebClickEvent(session *Session, msg *ClickEvent) error {
	if msg.Label == "" {
		return nil
	}
	return conn.clicks.exec(
		session.SessionID,
		session.ProjectID,
		session.TrackerVersion,
		nullableString(session.RevID),
		session.UserUUID,
		session.UserOS,
		nullableString(session.UserOSVersion),
		session.UserBrowser,
		nullableString(session.UserBrowserVersion),
		nullableString(session.UserDevice),
		session.UserDeviceType,
		session.UserCountry,
		datetime(msg.Timestamp),
		msg.Label,
		nullableUint32(uint32(msg.HesitationTime)),
	)
}

func (conn *Connector) InsertWebInputEvent(session *Session, msg *InputEvent) error {
	if msg.Label == "" {
		return nil
	}
	return conn.inputs.exec(
		session.SessionID,
		session.ProjectID,
		session.TrackerVersion,
		nullableString(session.RevID),
		session.UserUUID,
		session.UserOS,
		nullableString(session.UserOSVersion),
		session.UserBrowser,
		nullableString(session.UserBrowserVersion),
		nullableString(session.UserDevice),
		session.UserDeviceType,
		session.UserCountry,
		datetime(msg.Timestamp),
		msg.Label,
	)
}

func (conn *Connector) InsertWebErrorEvent(session *Session, msg *ErrorEvent) error {
	return conn.errors.exec(
		session.SessionID,
		session.ProjectID,
		session.TrackerVersion,
		nullableString(session.RevID),
		session.UserUUID,
		session.UserOS,
		nullableString(session.UserOSVersion),
		session.UserBrowser,
		nullableString(session.UserBrowserVersion),
		nullableString(session.UserDevice),
		session.UserDeviceType,
		session.UserCountry,
		datetime(msg.Timestamp),
		msg.Source,
		nullableString(msg.Name),
		msg.Message,
		hashid.WebErrorID(session.ProjectID, msg),
	)
}

func (conn *Connector) InsertWebPerformanceTrackAggr(session *Session, msg *PerformanceTrackAggr) error {
	var timestamp uint64 = (msg.TimestampStart + msg.TimestampEnd) / 2
	return conn.performance.exec(
		session.SessionID,
		session.ProjectID,
		session.TrackerVersion,
		nullableString(session.RevID),
		session.UserUUID,
		session.UserOS,
		nullableString(session.UserOSVersion),
		session.UserBrowser,
		nullableString(session.UserBrowserVersion),
		nullableString(session.UserDevice),
		session.UserDeviceType,
		session.UserCountry,
		datetime(timestamp),
		uint8(msg.MinFPS),
		uint8(msg.AvgFPS),
		uint8(msg.MaxFPS),
		uint8(msg.MinCPU),
		uint8(msg.AvgCPU),
		uint8(msg.MaxCPU),
		msg.MinTotalJSHeapSize,
		msg.AvgTotalJSHeapSize,
		msg.MaxTotalJSHeapSize,
		msg.MinUsedJSHeapSize,
		msg.AvgUsedJSHeapSize,
		msg.MaxUsedJSHeapSize,
	)
}

// TODO: make enum message type
var CONTEXT_MAP = map[uint64]string{0: "unknown", 1: "self", 2: "same-origin-ancestor", 3: "same-origin-descendant", 4: "same-origin", 5: "cross-origin-ancestor", 6: "cross-origin-descendant", 7: "cross-origin-unreachable", 8: "multiple-contexts"}
var CONTAINER_TYPE_MAP = map[uint64]string{0: "window", 1: "iframe", 2: "embed", 3: "object"}

func (conn *Connector) InsertLongtask(session *Session, msg *LongTask) error {
	return conn.longtasks.exec(
		session.SessionID,
		session.ProjectID,
		session.TrackerVersion,
		nullableString(session.RevID),
		session.UserUUID,
		session.UserOS,
		nullableString(session.UserOSVersion),
		session.UserBrowser,
		nullableString(session.UserBrowserVersion),
		nullableString(session.UserDevice),
		session.UserDeviceType,
		session.UserCountry,
		datetime(msg.Timestamp),
		CONTEXT_MAP[msg.Context],
		CONTAINER_TYPE_MAP[msg.ContainerType],
		msg.ContainerId,
		msg.ContainerName,
		msg.ContainerSrc,
	)
}
