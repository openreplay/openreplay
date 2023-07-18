package connector

import (
	"bytes"
	"fmt"
	"github.com/google/uuid"
	"log"
	"time"

	config "openreplay/backend/internal/config/connector"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/objectstorage"
)

// Saver collect sessions and events and saves them to Redshift
type Saver struct {
	cfg        *config.Config
	objStorage objectstorage.ObjectStorage
	db         *Redshift
	batch      []map[string]string
}

func New(cfg *config.Config, objStorage objectstorage.ObjectStorage, db *Redshift) *Saver {
	return &Saver{
		cfg:        cfg,
		objStorage: objStorage,
		db:         db,
	}
}

var eventColumns = []string{
	"sessionid",
	"consolelog_level",
	"consolelog_value",
	"customevent_name",
	"customevent_payload",
	"jsexception_message",
	"jsexception_name",
	"jsexception_payload",
	"jsexception_metadata",
	"networkrequest_type",
	"networkrequest_method",
	"networkrequest_url",
	"networkrequest_request",
	"networkrequest_response",
	"networkrequest_status",
	"networkrequest_timestamp",
	"networkrequest_duration",
	"issueevent_message_id",
	"issueevent_timestamp",
	"issueevent_type",
	"issueevent_context_string",
	"issueevent_context",
	"issueevent_payload",
	"issueevent_url",
	"customissue_name",
	"customissue_payload",
	"received_at",
	"batch_order_number",
}

func mapToString(m map[string]string) string {
	buf := bytes.NewBuffer(nil)
	for _, column := range eventColumns {
		if v, ok := m[column]; ok {
			buf.WriteString(v + "|")
		} else {
			buf.WriteString("|")
		}
	}
	return buf.String()[0 : buf.Len()-1]
}

// Empty string -> NULL
// Empty number -> empty string
// Delimiter -> "|"

func handleEventN(msg messages.Message) map[string]string {
	event := make(map[string]string)
	event["sessionid"] = fmt.Sprintf("%d", msg.SessionID())
	event["received_at"] = fmt.Sprintf("%d", uint64(time.Now().UnixMilli()))
	event["batch_order_number"] = fmt.Sprintf("%d", 0)

	switch m := msg.(type) {
	case *messages.ConsoleLog:
		event["consolelog_level"] = m.Level
		event["consolelog_value"] = m.Value
	case *messages.CustomEvent:
		event["customevent_name"] = m.Name
		event["customevent_payload"] = m.Payload
	case *messages.JSException:
		event["jsexception_name"] = m.Name
		event["jsexception_message"] = m.Message
		event["jsexception_payload"] = m.Payload
		event["jsexception_metadata"] = m.Metadata
	case *messages.NetworkRequest:
		event["networkrequest_type"] = m.Type
		event["networkrequest_method"] = m.Method
		event["networkrequest_url"] = m.URL
		event["networkrequest_request"] = m.Request
		event["networkrequest_response"] = m.Response
		event["networkrequest_status"] = fmt.Sprintf("%d", m.Status)
		event["networkrequest_timestamp"] = fmt.Sprintf("%d", m.Timestamp)
		event["networkrequest_duration"] = fmt.Sprintf("%d", m.Duration)
	case *messages.IssueEvent:
		event["issueevent_message_id"] = fmt.Sprintf("%d", m.MessageID)
		event["issueevent_timestamp"] = fmt.Sprintf("%d", m.Timestamp)
		event["issueevent_type"] = m.Type
		event["issueevent_context_string"] = m.ContextString
		event["issueevent_context"] = m.Context
		event["issueevent_payload"] = m.Payload
		event["issueevent_url"] = m.URL
	case *messages.CustomIssue:
		event["customissue_name"] = m.Name
		event["customissue_payload"] = m.Payload
	}
	return event
}

type Event struct {
	SessionID                         uint64
	ConsoleLogLevel                   string
	ConsoleLogValue                   string
	CustomEventName                   string
	CustomEventPayload                string
	NetworkRequestType                string
	NetworkRequestMethod              string
	NetworkRequestURL                 string
	NetworkRequestRequest             string
	NetworkRequestResponse            string
	NetworkRequestStatus              uint64
	NetworkRequestTimestamp           uint64
	NetworkRequestDuration            uint64
	IssueEventMessageID               uint64
	IssueEventTimestamp               uint64
	IssueEventType                    string
	IssueEventContextString           string
	IssueEventContext                 string
	IssueEventPayload                 string
	IssueEventURL                     string
	CustomIssueName                   string
	CustomIssuePayload                string
	MetadataKey                       string
	MetadataValue                     string
	MouseClickID                      uint64
	MouseClickLabel                   string
	MouseClickSelector                string
	MouseClickHesitation              uint64
	PageEventFirstContentfulPaint     uint64
	PageEventFirstPaint               uint64
	PageEventMessageID                uint64
	PageEventReferrer                 string
	PageEventSpeedIndex               uint64
	PageEventTimestamp                uint64
	PageEventURL                      string
	PageRenderTimingTimeToInteractive uint64
	PageRenderTimingVisuallyComplete  uint64
	SetViewPortSizeHeight             uint64
	SetViewPortSizeWidth              uint64
	TimestampTimestamp                uint64
	UserAnonymousID                   string
	UserID                            string
	ReceivedAt                        uint64
	BatchOrderNumber                  uint64
}

func (s *Saver) handleEvent(msg messages.Message) *Event {
	event := &Event{
		SessionID:  msg.SessionID(),
		ReceivedAt: uint64(time.Now().UnixMilli()),
	}
	switch m := msg.(type) {
	case *messages.ConsoleLog:
		event.ConsoleLogLevel = m.Level
		event.ConsoleLogValue = m.Value
	case *messages.CustomEvent:
		event.CustomEventName = m.Name
		event.CustomEventPayload = m.Payload
	case *messages.Metadata:
		event.MetadataKey = m.Key
		event.MetadataValue = m.Value
	case *messages.MouseClick:
		event.MouseClickID = m.ID
		event.MouseClickLabel = m.Label
		event.MouseClickSelector = m.Selector
		event.MouseClickHesitation = m.HesitationTime
	case *messages.NetworkRequest:
		event.NetworkRequestType = m.Type
		event.NetworkRequestMethod = m.Method
		event.NetworkRequestURL = m.URL
		event.NetworkRequestRequest = m.Request
		event.NetworkRequestResponse = m.Response
		event.NetworkRequestStatus = m.Status
		event.NetworkRequestTimestamp = m.Timestamp
		event.NetworkRequestDuration = m.Duration
	case *messages.PageEvent:
		event.PageEventFirstContentfulPaint = m.FirstContentfulPaint
		event.PageEventFirstPaint = m.FirstPaint
		event.PageEventMessageID = m.MessageID
		event.PageEventReferrer = m.Referrer
		event.PageEventSpeedIndex = m.SpeedIndex
		event.PageEventTimestamp = m.Timestamp
		event.PageEventURL = m.URL
	case *messages.PageRenderTiming:
		event.PageRenderTimingTimeToInteractive = m.TimeToInteractive
		event.PageRenderTimingVisuallyComplete = m.VisuallyComplete
	case *messages.SetViewportSize:
		event.SetViewPortSizeHeight = m.Height
		event.SetViewPortSizeWidth = m.Width
	case *messages.Timestamp:
		event.TimestampTimestamp = m.Timestamp
	case *messages.UserAnonymousID:
		event.UserAnonymousID = m.ID
	case *messages.UserID:
		event.UserID = m.ID
	case *messages.IssueEvent:
		event.IssueEventMessageID = m.MessageID
		event.IssueEventTimestamp = m.Timestamp
		event.IssueEventType = m.Type
		event.IssueEventContextString = m.ContextString
		event.IssueEventContext = m.Context
		event.IssueEventPayload = m.Payload
		event.IssueEventURL = m.URL
	case *messages.CustomIssue:
		event.CustomIssueName = m.Name
		event.CustomIssuePayload = m.Payload
	}
	return event
}

type DetailedEvent struct {
	SessionID                                uint64
	TimestampTimestamp                       uint64
	SessionStartTrackerVersion               string
	SessionStartRevID                        string
	SessionStartTimestamp                    uint64
	SessionStartUserUUID                     string
	SessionStartUserAgent                    string
	SessionStartUserOS                       string
	SessionStartUserOSVersion                string
	SessionStartUserBrowser                  string
	SessionStartUserBrowserVersion           string
	SessionStartUserDevice                   string
	SessionStartUserDeviceType               string
	SessionStartUserDeviceMemorySize         uint64
	SessionStartUserDeviceHeapSize           uint64
	SessionStartUserCountry                  string
	CreateIFrameDocumentFrameID              uint64
	CreateIFrameDocumentID                   uint64
	ReceivedAt                               uint64
	BatchOrderNumber                         uint64
	SetViewPortSizeHeight                    uint64
	SetViewPortSizeWidth                     uint64
	SetViewPortScrollX                       int64
	SetViewPortScrollY                       int64
	SetNodeScrollID                          uint64
	SetNodeScrollX                           int64
	SetNodeScrollY                           int64
	ConsoleLogLevel                          string
	ConsoleLogValue                          string
	PageLoadTimingRequestStart               uint64
	PageLoadTimingResponseStart              uint64
	PageLoadTimingResponseEnd                uint64
	PageLoadTimingDomContentLoadedEventStart uint64
	PageLoadTimingDomContentLoadedEventEnd   uint64
	PageLoadTimingLoadEventStart             uint64
	PageLoadTimingLoadEventEnd               uint64
	PageLoadTimingFirstPaint                 uint64
	PageLoadTimingFirstContentfulPaint       uint64
	PageRenderTimingSpeedIndex               uint64
	PageRenderTimingVisuallyComplete         uint64
	PageRenderTimingTimeToInteractive        uint64
	IntegrationEventTimestamp                uint64
	IntegrationEventName                     string
	IntegrationEventPayload                  string
	IntegrationEventSource                   string
	IntegrationEventMessage                  string
	UserIDID                                 string
	UserAnonymousIDID                        string
	MetadataKey                              string
	MetadataValue                            string
	BatchMetaPageNo                          uint64
	BatchMetaFirstIndex                      uint64
	BatchMetaTimestamp                       int64
	BatchMetadataPageNo                      uint64
	BatchMetadataFirstIndex                  uint64
	BatchMetadataTimestamp                   int64
	BatchMetadataVersion                     uint64
	BatchMetadataLocation                    string
	InputChangeID                            uint64
	InputChangeValue                         string
	InputChangeValueMasked                   bool
	InputChangeLabel                         string
	InputChangeHesitationTime                int64
	InputChangeInputDuration                 int64
	SelectionChangeSelection                 string
	SelectionChangeSelectionStart            uint64
	SelectionChangeSelectionEnd              uint64
	MouseThrashingTimestamp                  uint64
	UnbindNodesTotalRemovedPercent           uint64
	ResourceTimingTimestamp                  uint64
	ResourceTimingDuration                   uint64
	ResourceTimingTTFB                       uint64
	ResourceTimingHeaderSize                 uint64
	ResourceTimingEncodedBodySize            uint64
	ResourceTimingDecodedBodySize            uint64
	ResourceTimingURL                        string
	ResourceTimingInitiator                  string
	ResourceTimingTransferredSize            uint64
	ResourceTimingCached                     bool
	IssueEventMessageID                      uint64
	IssueEventTimestamp                      uint64
	IssueEventType                           string
	IssueEventContextString                  string
	IssueEventContext                        string
	IssueEventPayload                        string
	IssueEventURL                            string
	SessionEndTimestamp                      uint64
	SessionEndEncryptionKey                  string
	SessionSearchTimestamp                   uint64
	SessionSearchPartition                   uint64
	PerformanceTrackFrames                   int64
	PerformanceTrackTicks                    int64
	PerformanceTrackTotalJSHeapSize          uint64
	PerformanceTrackUsedJSHeapSize           uint64
	PerformanceTrackAggrTimestampStart       uint64
	PerformanceTrackAggrTimestampEnd         uint64
	PerformanceTrackAggrMinFPS               uint64
	PerformanceTrackAggrMaxFPS               uint64
	PerformanceTrackAggrAvgFPS               uint64
	PerformanceTrackAggrMinCPU               uint64
	PerformanceTrackAggrMaxCPU               uint64
	PerformanceTrackAggrAvgCPU               uint64
	PerformanceTrackAggrMinTotalJSHeapSize   uint64
	PerformanceTrackAggrMaxTotalJSHeapSize   uint64
	PerformanceTrackAggrAvgTotalJSHeapSize   uint64
	PerformanceTrackAggrMinUsedJSHeapSize    uint64
	PerformanceTrackAggrMaxUsedJSHeapSize    uint64
	PerformanceTrackAggrAvgUsedJSHeapSize    uint64
	ConnectionInformationDownlink            uint64
	ConnectionInformationType                string
	PageEventMessageID                       uint64
	PageEventTimestamp                       uint64
	PageEventURL                             string
	PageEventReferrer                        string
	PageEventLoaded                          bool
	PageEventRequestStart                    uint64
	PageEventResponseStart                   uint64
	PageEventResponseEnd                     uint64
	PageEventDomContentLoadedEventStart      uint64
	PageEventDomContentLoadedEventEnd        uint64
	PageEventLoadEventStart                  uint64
	PageEventLoadEventEnd                    uint64
	PageEventFirstPaint                      uint64
	PageEventFirstContentfulPaint            uint64
	PageEventSpeedIndex                      uint64
	InputEventMessageID                      uint64
	InputEventTimestamp                      uint64
	InputEventValue                          string
	InputEventValueMasked                    bool
	InputEventLabel                          string
	CustomEventName                          string
	CustomEventPayload                       string
	LoadFontParentID                         uint64
	LoadFontFamily                           string
	LoadFontSource                           string
	LoadFontDescriptors                      string
	SetNodeFocusID                           int64
	AdoptedSSReplaceURLBasedSheetID          uint64
	AdoptedSSReplaceURLBasedText             string
	AdoptedSSReplaceURLBasedBaseURL          string
	AdoptedSSReplaceSheetID                  uint64
	AdoptedSSReplaceText                     string
	AdoptedSSInsertRuleURLBasedSheetID       uint64
	AdoptedSSInsertRuleURLBasedRule          string
	AdoptedSSInsertRuleURLBasedIndex         uint64
	AdoptedSSInsertRuleURLBasedBaseURL       string
	AdoptedSSInsertRuleSheetID               uint64
	AdoptedSSInsertRuleRule                  string
	AdoptedSSInsertRuleIndex                 uint64
	AdoptedSSDeleteRuleSheetID               uint64
	AdoptedSSDeleteRuleIndex                 uint64
	AdoptedSSAddOwnerSheetID                 uint64
	AdoptedSSAddOwnerID                      uint64
	AdoptedSSRemoveOwnerSheetID              uint64
	AdoptedSSRemoveOwnerID                   uint64
	JSExceptionName                          string
	JSExceptionMessage                       string
	JSExceptionPayload                       string
	JSExceptionMetadata                      string
	ZustandMutation                          string
	ZustandState                             string
	FetchMethod                              string
	FetchURL                                 string
	FetchRequest                             string
	FetchStatus                              uint64
	FetchTimestamp                           uint64
	FetchDuration                            uint64
	SetNodeAttributeDictID                   uint64
	SetNodeAttributeDictNameKey              uint64
	SetNodeAttributeDictValueKey             uint64
	ProfilerName                             string
	ProfilerDuration                         uint64
	ProfilerArgs                             string
	ProfilerResult                           string
	GraphQLOperationName                     string
	GraphQLOperationKind                     string
	GraphQLVariables                         string
	GraphQLResponse                          string
	MouseClickID                             uint64
	MouseClickHesitationTime                 uint64
	MouseClickLabel                          string
	MouseClickSelector                       string
	SetPageLocationURL                       string
	SetPageLocationReferrer                  string
	SetPageLocationNavigationStart           uint64
	MouseMoveX                               uint64
	MouseMoveY                               uint64
	LongTaskTimestamp                        uint64
	LongTaskDuration                         uint64
	LongTaskContext                          uint64
	LongTaskContainerType                    uint64
	LongTaskContainerSrc                     string
	LongTaskContainerID                      string
	LongTaskContainerName                    string
	TechnicalInfoType                        string
	TechnicalInfoValue                       string
	CustomIssueName                          string
	CustomIssuePayload                       string
	AssetCacheURL                            string
}

func (s *Saver) handleDetailedEvent(msg messages.Message) *DetailedEvent {
	event := &DetailedEvent{
		SessionID:  msg.SessionID(),
		ReceivedAt: uint64(time.Now().UnixMilli()),
	}
	switch m := msg.(type) {
	case *messages.Timestamp:
		event.TimestampTimestamp = m.Timestamp
	case *messages.SessionStart:
		event.SessionStartTrackerVersion = m.TrackerVersion
		event.SessionStartRevID = m.RevID
		event.SessionStartTimestamp = m.Timestamp
		event.SessionStartUserUUID = m.UserUUID
		event.SessionStartUserAgent = m.UserAgent
		event.SessionStartUserOS = m.UserOS
		event.SessionStartUserOSVersion = m.UserOSVersion
		event.SessionStartUserBrowser = m.UserBrowser
		event.SessionStartUserBrowserVersion = m.UserBrowserVersion
		event.SessionStartUserDevice = m.UserDevice
		event.SessionStartUserDeviceType = m.UserDeviceType
		event.SessionStartUserDeviceMemorySize = m.UserDeviceMemorySize
		event.SessionStartUserDeviceHeapSize = m.UserDeviceHeapSize
		event.SessionStartUserCountry = m.UserCountry
	case *messages.CreateIFrameDocument:
		event.CreateIFrameDocumentFrameID = m.FrameID
		event.CreateIFrameDocumentID = m.ID
	case *messages.SetViewportSize:
		event.SetViewPortSizeHeight = m.Height
		event.SetViewPortSizeWidth = m.Width
	case *messages.SetViewportScroll:
		event.SetViewPortScrollX = m.X
		event.SetViewPortScrollY = m.Y
	case *messages.SetNodeScroll:
		event.SetNodeScrollID = m.ID
		event.SetNodeScrollX = m.X
		event.SetNodeScrollY = m.Y
	case *messages.ConsoleLog:
		event.ConsoleLogLevel = m.Level
		event.ConsoleLogValue = m.Value
	case *messages.PageLoadTiming:
		event.PageLoadTimingRequestStart = m.RequestStart
		event.PageLoadTimingResponseStart = m.ResponseStart
		event.PageLoadTimingResponseEnd = m.ResponseEnd
		event.PageLoadTimingDomContentLoadedEventStart = m.DomContentLoadedEventStart
		event.PageLoadTimingDomContentLoadedEventEnd = m.DomContentLoadedEventEnd
		event.PageLoadTimingLoadEventStart = m.LoadEventStart
		event.PageLoadTimingLoadEventEnd = m.LoadEventEnd
		event.PageLoadTimingFirstPaint = m.FirstPaint
		event.PageLoadTimingFirstContentfulPaint = m.FirstContentfulPaint
	case *messages.PageRenderTiming:
		event.PageRenderTimingSpeedIndex = m.SpeedIndex
		event.PageRenderTimingVisuallyComplete = m.VisuallyComplete
		event.PageRenderTimingTimeToInteractive = m.TimeToInteractive
	case *messages.IntegrationEvent:
		event.IntegrationEventTimestamp = m.Timestamp
		event.IntegrationEventName = m.Name
		event.IntegrationEventPayload = m.Payload
		event.IntegrationEventSource = m.Source
		event.IntegrationEventMessage = m.Message
	case *messages.UserID:
		event.UserIDID = m.ID
	case *messages.UserAnonymousID:
		event.UserAnonymousIDID = m.ID
	case *messages.Metadata:
		event.MetadataKey = m.Key
		event.MetadataValue = m.Value
	case *messages.BatchMeta:
		event.BatchMetaPageNo = m.PageNo
		event.BatchMetaFirstIndex = m.FirstIndex
		event.BatchMetaTimestamp = m.Timestamp
	case *messages.BatchMetadata:
		event.BatchMetadataPageNo = m.PageNo
		event.BatchMetadataFirstIndex = m.FirstIndex
		event.BatchMetadataTimestamp = m.Timestamp
		event.BatchMetadataVersion = m.Version
		event.BatchMetadataLocation = m.Location
	case *messages.InputChange:
		event.InputChangeID = m.ID
		event.InputChangeValue = m.Value
		event.InputChangeValueMasked = m.ValueMasked
		event.InputChangeLabel = m.Label
		event.InputChangeHesitationTime = m.HesitationTime
		event.InputChangeInputDuration = m.InputDuration
	case *messages.SelectionChange:
		event.SelectionChangeSelection = m.Selection
		event.SelectionChangeSelectionStart = m.SelectionStart
		event.SelectionChangeSelectionEnd = m.SelectionEnd
	case *messages.MouseThrashing:
		event.MouseThrashingTimestamp = m.Timestamp
	case *messages.UnbindNodes:
		event.UnbindNodesTotalRemovedPercent = m.TotalRemovedPercent
	case *messages.ResourceTiming:
		event.ResourceTimingTimestamp = m.Timestamp
		event.ResourceTimingDuration = m.Duration
		event.ResourceTimingTTFB = m.TTFB
		event.ResourceTimingHeaderSize = m.HeaderSize
		event.ResourceTimingEncodedBodySize = m.EncodedBodySize
		event.ResourceTimingDecodedBodySize = m.DecodedBodySize
		event.ResourceTimingURL = m.URL
		event.ResourceTimingInitiator = m.Initiator
		event.ResourceTimingTransferredSize = m.TransferredSize
		event.ResourceTimingCached = m.Cached
	case *messages.IssueEvent:
		event.IssueEventMessageID = m.MessageID
		event.IssueEventTimestamp = m.Timestamp
		event.IssueEventType = m.Type
		event.IssueEventContextString = m.ContextString
		event.IssueEventContext = m.Context
		event.IssueEventPayload = m.Payload
		event.IssueEventURL = m.URL
	case *messages.SessionEnd:
		event.SessionEndTimestamp = m.Timestamp
		event.SessionEndEncryptionKey = m.EncryptionKey
	case *messages.SessionSearch:
		event.SessionSearchTimestamp = m.Timestamp
		event.SessionSearchPartition = m.Partition
	case *messages.PerformanceTrack:
		event.PerformanceTrackFrames = m.Frames
		event.PerformanceTrackTicks = m.Ticks
		event.PerformanceTrackTotalJSHeapSize = m.TotalJSHeapSize
		event.PerformanceTrackUsedJSHeapSize = m.UsedJSHeapSize
	case *messages.PerformanceTrackAggr:
		event.PerformanceTrackAggrTimestampStart = m.TimestampStart
		event.PerformanceTrackAggrTimestampEnd = m.TimestampEnd
		event.PerformanceTrackAggrMinFPS = m.MinFPS
		event.PerformanceTrackAggrMaxFPS = m.MaxFPS
		event.PerformanceTrackAggrAvgFPS = m.AvgFPS
		event.PerformanceTrackAggrMinCPU = m.MinCPU
		event.PerformanceTrackAggrMaxCPU = m.MaxCPU
		event.PerformanceTrackAggrAvgCPU = m.AvgCPU
		event.PerformanceTrackAggrMinTotalJSHeapSize = m.MinTotalJSHeapSize
		event.PerformanceTrackAggrMaxTotalJSHeapSize = m.MaxTotalJSHeapSize
		event.PerformanceTrackAggrAvgTotalJSHeapSize = m.AvgTotalJSHeapSize
		event.PerformanceTrackAggrMinUsedJSHeapSize = m.MinUsedJSHeapSize
		event.PerformanceTrackAggrMaxUsedJSHeapSize = m.MaxUsedJSHeapSize
		event.PerformanceTrackAggrAvgUsedJSHeapSize = m.AvgUsedJSHeapSize
	case *messages.ConnectionInformation:
		event.ConnectionInformationDownlink = m.Downlink
		event.ConnectionInformationType = m.Type
	case *messages.PageEvent:
		event.PageEventMessageID = m.MessageID
		event.PageEventTimestamp = m.Timestamp
		event.PageEventURL = m.URL
		event.PageEventReferrer = m.Referrer
		event.PageEventLoaded = m.Loaded
		event.PageEventRequestStart = m.RequestStart
		event.PageEventResponseStart = m.ResponseStart
		event.PageEventResponseEnd = m.ResponseEnd
		event.PageEventDomContentLoadedEventStart = m.DomContentLoadedEventStart
		event.PageEventDomContentLoadedEventEnd = m.DomContentLoadedEventEnd
		event.PageEventLoadEventStart = m.LoadEventStart
		event.PageEventLoadEventEnd = m.LoadEventEnd
		event.PageEventFirstPaint = m.FirstPaint
		event.PageEventFirstContentfulPaint = m.FirstContentfulPaint
		event.PageEventSpeedIndex = m.SpeedIndex
	case *messages.InputEvent:
		event.InputEventMessageID = m.MessageID
		event.InputEventTimestamp = m.Timestamp
		event.InputEventValue = m.Value
		event.InputEventValueMasked = m.ValueMasked
		event.InputEventLabel = m.Label
	case *messages.CustomEvent:
		event.CustomEventName = m.Name
		event.CustomEventPayload = m.Payload
	case *messages.LoadFontFace:
		event.LoadFontParentID = m.ParentID
		event.LoadFontFamily = m.Family
		event.LoadFontSource = m.Source
		event.LoadFontDescriptors = m.Descriptors
	case *messages.SetNodeFocus:
		event.SetNodeFocusID = m.ID
	case *messages.AdoptedSSReplaceURLBased:
		event.AdoptedSSReplaceURLBasedSheetID = m.SheetID
		event.AdoptedSSReplaceURLBasedText = m.Text
		event.AdoptedSSReplaceURLBasedBaseURL = m.BaseURL
	case *messages.AdoptedSSReplace:
		event.AdoptedSSReplaceSheetID = m.SheetID
		event.AdoptedSSReplaceText = m.Text
	case *messages.AdoptedSSInsertRuleURLBased:
		event.AdoptedSSInsertRuleURLBasedSheetID = m.SheetID
		event.AdoptedSSInsertRuleURLBasedRule = m.Rule
		event.AdoptedSSInsertRuleURLBasedIndex = m.Index
		event.AdoptedSSInsertRuleURLBasedBaseURL = m.BaseURL
	case *messages.AdoptedSSInsertRule:
		event.AdoptedSSInsertRuleSheetID = m.SheetID
		event.AdoptedSSInsertRuleRule = m.Rule
		event.AdoptedSSInsertRuleIndex = m.Index
	case *messages.AdoptedSSDeleteRule:
		event.AdoptedSSDeleteRuleSheetID = m.SheetID
		event.AdoptedSSDeleteRuleIndex = m.Index
	case *messages.AdoptedSSAddOwner:
		event.AdoptedSSAddOwnerSheetID = m.SheetID
		event.AdoptedSSAddOwnerID = m.ID
	case *messages.AdoptedSSRemoveOwner:
		event.AdoptedSSRemoveOwnerSheetID = m.SheetID
		event.AdoptedSSRemoveOwnerID = m.ID
	case *messages.JSException:
		event.JSExceptionName = m.Name
		event.JSExceptionMessage = m.Message
		event.JSExceptionPayload = m.Payload
		event.JSExceptionMetadata = m.Metadata
	case *messages.Zustand:
		event.ZustandMutation = m.Mutation
		event.ZustandState = m.State
	case *messages.Fetch:
		event.FetchMethod = m.Method
		event.FetchURL = m.URL
		event.FetchRequest = m.Request
		event.FetchStatus = m.Status
		event.FetchTimestamp = m.Timestamp
		event.FetchDuration = m.Duration
	case *messages.SetNodeAttributeDict:
		event.SetNodeAttributeDictID = m.ID
		event.SetNodeAttributeDictNameKey = m.NameKey
		event.SetNodeAttributeDictValueKey = m.ValueKey
	case *messages.Profiler:
		event.ProfilerName = m.Name
		event.ProfilerDuration = m.Duration
		event.ProfilerArgs = m.Args
		event.ProfilerResult = m.Result
	case *messages.GraphQL:
		event.GraphQLOperationName = m.OperationName
		event.GraphQLOperationKind = m.OperationKind
		event.GraphQLVariables = m.Variables
		event.GraphQLResponse = m.Response
	case *messages.MouseClick:
		event.MouseClickID = m.ID
		event.MouseClickHesitationTime = m.HesitationTime
		event.MouseClickLabel = m.Label
		event.MouseClickSelector = m.Selector
	case *messages.SetPageLocation:
		event.SetPageLocationURL = m.URL
		event.SetPageLocationReferrer = m.Referrer
		event.SetPageLocationNavigationStart = m.NavigationStart
	case *messages.MouseMove:
		event.MouseMoveX = m.X
		event.MouseMoveY = m.Y
	case *messages.LongTask:
		event.LongTaskTimestamp = m.Timestamp
		event.LongTaskDuration = m.Duration
		event.LongTaskContext = m.Context
		event.LongTaskContainerType = m.ContainerType
		event.LongTaskContainerSrc = m.ContainerSrc
		event.LongTaskContainerID = m.ContainerId
		event.LongTaskContainerName = m.ContainerName
	case *messages.TechnicalInfo:
		event.TechnicalInfoType = m.Type
		event.TechnicalInfoValue = m.Value
	case *messages.CustomIssue:
		event.CustomIssueName = m.Name
		event.CustomIssuePayload = m.Payload
	case *messages.AssetCache:
		event.AssetCacheURL = m.URL
	}
	return event
}

func (s *Saver) Handle(msg messages.Message) {
	newEvent := handleEventN(msg)
	if s.batch == nil {
		s.batch = make([]map[string]string, 0, 2)
	}
	s.batch = append(s.batch, newEvent)
	//if s.cfg.EventLevel == "normal" {
	//	event := s.handleEvent(msg)
	//	fmt.Println(event)
	//} else {
	//	event := s.handleDetailedEvent(msg)
	//	fmt.Println(event)
	//}
	return
}

func eventsToBuffer(batch []map[string]string) *bytes.Buffer {
	buf := bytes.NewBuffer(nil)

	// Write header
	for _, column := range eventColumns {
		buf.WriteString(column + "|")
	}
	buf.Truncate(buf.Len() - 1)

	// Write data
	for _, event := range batch {
		buf.WriteString("\n")
		for _, column := range eventColumns {
			buf.WriteString(event[column] + "|")
		}
		buf.Truncate(buf.Len() - 1)
	}
	return buf
}

// Commit saves batch to Redshift
func (s *Saver) Commit() {
	if len(s.batch) == 0 {
		log.Printf("empty batch")
		return
	}

	// Validate column names
	if err := validateColumnNames(eventColumns); err != nil {
		log.Printf("can't validate column names: %s", err)
		return
	}

	// Send data to S3
	fileName := fmt.Sprintf("test_connector/connector_events-%s.csv", uuid.New().String())
	// Create csv file
	buf := eventsToBuffer(s.batch)

	reader := bytes.NewReader(buf.Bytes())
	if err := s.objStorage.Upload(reader, fileName, "text/csv", objectstorage.NoCompression); err != nil {
		log.Printf("can't upload file to s3: %s", err)
		return
	}
	// Copy data from s3 bucket to redshift
	if err := s.db.Copy("test_connector_events", fileName, "|", true, false); err != nil {
		log.Printf("can't copy data from s3 to redshift: %s", err)
		return
	}
	return
}

func (s *Saver) Close() error {
	// Close connection to Redshift
	return nil
}

var reservedWords = []string{"ALL", "ANALYSE", "ANALYZE", "AND", "ANY", "ARRAY", "AS", "ASC", "ASYMMETRIC", "BOTH", "CASE", "CAST", "CHECK", "COLLATE", "COLUMN", "CONSTRAINT", "CREATE", "CROSS", "CURRENT_CATALOG", "CURRENT_DATE", "CURRENT_ROLE", "CURRENT_SCHEMA", "CURRENT_TIME", "CURRENT_TIMESTAMP", "CURRENT_USER", "DEFAULT", "DEFERRABLE", "DESC", "DISTINCT", "DO", "ELSE", "END", "EXCEPT", "FALSE", "FOR", "FOREIGN", "FREEZE", "FROM", "FULL", "GRANT", "GROUP", "HAVING", "ILIKE", "IN", "INITIALLY", "INNER", "INTERSECT", "INTO", "IS", "ISNULL", "JOIN", "LEADING", "LEFT", "LIKE", "LIMIT", "LOCALTIME", "LOCALTIMESTAMP", "NATURAL", "NEW", "NOT", "NOTNULL", "NULL", "OFF", "OFFSET", "OLD", "ON", "ONLY", "OR", "ORDER", "OUTER", "OVERLAPS", "PLACING", "PRIMARY", "REFERENCES", "RETURNING", "RIGHT", "SELECT", "SESSION_USER", "SIMILAR", "SOME", "SYMMETRIC", "TABLE", "THEN", "TO", "TRAILING", "TRUE", "UNION", "UNIQUE", "USER", "USING", "VERBOSE", "WHEN", "WHERE", "WINDOW", "WITH"}

func validateColumnNames(columns []string) error {
	for _, column := range columns {
		for _, reservedWord := range reservedWords {
			if column == reservedWord {
				return fmt.Errorf("column name %s is a reserved word", column)
			}
		}
	}
	return nil
}
