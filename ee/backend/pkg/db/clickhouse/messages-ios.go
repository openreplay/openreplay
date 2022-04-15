package clickhouse

import (
	"errors"
	
	"openreplay/backend/pkg/hashid"
	"openreplay/backend/pkg/url"
	. "openreplay/backend/pkg/db/types"
	. "openreplay/backend/pkg/messages"
)


// TODO: join sessions & sessions_ios clcikhouse tables
func (conn *Connector) InsertIOSSession(session *Session) error {
	if (session.Duration == nil) {
		return errors.New("Clickhouse: trying to insert session with ")
	}
	return conn.sessionsIOS.exec(
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
	)
}

// func (conn *Connector) IOSScreenEnter(session *Session, msg *PageEvent) error {
// 	return conn.pagesIOS.exec(
// 		session.SessionID,
// 		session.ProjectID,
// 		session.TrackerVersion, nullableString(session.RevID),
// 		session.UserUUID,
// 		session.UserOS,
// 		nullableString(session.UserOSVersion),
// 		nullableString(session.UserDevice),
// 		session.UserDeviceType,
// 		session.UserCountry,
// 		datetime(msg.Timestamp),
// 		utils.DiscardURLQuery(msg.URL),
// 		nullableUint16(uint16(msg.RequestStart)),
// 		nullableUint16(uint16(msg.ResponseStart)),
// 		nullableUint16(uint16(msg.ResponseEnd)),
// 		nullableUint16(uint16(msg.DomContentLoadedEventStart)),
// 		nullableUint16(uint16(msg.DomContentLoadedEventEnd)),
// 		nullableUint16(uint16(msg.LoadEventStart)),
// 		nullableUint16(uint16(msg.LoadEventEnd)),
// 		nullableUint16(uint16(msg.FirstPaint)),
// 		nullableUint16(uint16(msg.FirstContentfulPaint)),
// 		nullableUint16(uint16(msg.SpeedIndex)),
// 		nullableUint16(uint16(msg.VisuallyComplete)),
// 		nullableUint16(uint16(msg.TimeToInteractive)),
// 	)
// }

func (conn *Connector) InsertIOSClickEvent(session *Session, msg *IOSClickEvent) error {
	if msg.Label == "" {
		return nil
	}
	return conn.clicksIOS.exec(
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
		datetime(msg.Timestamp),
		msg.Label,
	)
}

func (conn *Connector) InsertIOSInputEvent(session *Session, msg *IOSInputEvent) error {
	if msg.Label == "" {
		return nil
	}
	return conn.inputsIOS.exec(
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
		datetime(msg.Timestamp),
		msg.Label,
	)
}

func (conn *Connector) InsertIOSCrash(session *Session, msg *IOSCrash) error {
	return conn.crashesIOS.exec(
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
		datetime(msg.Timestamp),
		msg.Name,
		msg.Reason,
		hashid.IOSCrashID(session.ProjectID, msg),
	)
}

func (conn *Connector) InsertIOSNetworkCall(session *Session, msg *IOSNetworkCall) error {
	return conn.resourcesIOS.exec(
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
		datetime(msg.Timestamp),
		url.DiscardURLQuery(msg.URL),
		nullableUint16(uint16(msg.Duration)),
		nullableUint32(uint32(len(msg.Body))),
		msg.Success,
		url.EnsureMethod(msg.Method), // nullableString causes error  "unexpected type *string"
		nullableUint16(uint16(msg.Status)),
	)
}

func (conn *Connector) InsertIOSPerformanceAggregated(session *Session, msg *IOSPerformanceAggregated) error {
	var timestamp uint64 = (msg.TimestampStart + msg.TimestampEnd) / 2
	return conn.performanceIOS.exec(
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
		datetime(timestamp),
		uint8(msg.MinFPS),
		uint8(msg.AvgFPS),
		uint8(msg.MaxFPS),
		uint8(msg.MinCPU),
		uint8(msg.AvgCPU),
		uint8(msg.MaxCPU),
		msg.MinMemory,
		msg.AvgMemory,
		msg.MaxMemory,
	)
}
