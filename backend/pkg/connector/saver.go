package connector

import (
	"bytes"
	"fmt"
	"github.com/google/uuid"
	"log"
	"openreplay/backend/internal/http/geoip"
	"strconv"
	"time"

	config "openreplay/backend/internal/config/connector"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/objectstorage"
)

// Saver collect sessions and events and saves them to Redshift
type Saver struct {
	cfg              *config.Config
	objStorage       objectstorage.ObjectStorage
	db               *Redshift
	sessions         map[uint64]map[string]string
	finishedSessions []uint64
	events           []map[string]string
}

func New(cfg *config.Config, objStorage objectstorage.ObjectStorage, db *Redshift) *Saver {
	return &Saver{
		cfg:        cfg,
		objStorage: objStorage,
		db:         db,
	}
}

var sessionColumns = []string{
	"sessionid",
	"user_agent", // decided to remove from DB ???
	"user_browser",
	"user_browser_version",
	"user_country", // s.UserCountry
	"user_device",  // s.UserDevice
	"user_device_heap_size",
	"user_device_memory_size",
	"user_device_type", // s.UserDeviceType
	"user_os",          // s.UserOS
	"user_os_version",  // s.UserOSVersion
	"user_uuid",        // s.UserUUID
	"connection_effective_bandwidth",
	"connection_type",
	"metadata_key",            // ??? last one
	"metadata_value",          // ??? last one
	"referrer",                // s.Referrer
	"user_anonymous_id",       // s.UserAnonymousID
	"user_id",                 // s.UserID
	"session_start_timestamp", // s.Timestamp
	"session_end_timestamp",   // ??? can be calculated
	"session_duration",        // s.Duration
	"first_contentful_paint",
	"speed_index",
	"visually_complete",
	"timing_time_to_interactive",
	"avg_cpu",
	"avg_fps",
	"max_cpu",
	"max_fps",
	"max_total_js_heap_size",
	"max_used_js_heap_size",
	"js_exceptions_count",
	"inputs_count",
	"clicks_count",
	"issues_count",
	"urls_count",
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

func QUOTES(s string) string {
	return strconv.Quote(s)
}

func handleEvent(msg messages.Message) map[string]string {
	event := make(map[string]string)

	switch m := msg.(type) {
	case *messages.ConsoleLog:
		event["consolelog_level"] = QUOTES(m.Level)
		event["consolelog_value"] = QUOTES(m.Value)
	case *messages.CustomEvent:
		event["customevent_name"] = QUOTES(m.Name)
		event["customevent_payload"] = QUOTES(m.Payload)
	case *messages.JSException:
		event["jsexception_name"] = QUOTES(m.Name)
		event["jsexception_message"] = QUOTES(m.Message)
		event["jsexception_payload"] = QUOTES(m.Payload)
		event["jsexception_metadata"] = QUOTES(m.Metadata)
	case *messages.NetworkRequest:
		event["networkrequest_type"] = QUOTES(m.Type)
		event["networkrequest_method"] = QUOTES(m.Method)
		event["networkrequest_url"] = QUOTES(m.URL)
		event["networkrequest_request"] = QUOTES(m.Request)
		event["networkrequest_response"] = QUOTES(m.Response)
		event["networkrequest_status"] = fmt.Sprintf("%d", m.Status)
		event["networkrequest_timestamp"] = fmt.Sprintf("%d", m.Timestamp)
		event["networkrequest_duration"] = fmt.Sprintf("%d", m.Duration)
	case *messages.IssueEvent:
		event["issueevent_message_id"] = fmt.Sprintf("%d", m.MessageID)
		event["issueevent_timestamp"] = fmt.Sprintf("%d", m.Timestamp)
		event["issueevent_type"] = QUOTES(m.Type)
		event["issueevent_context_string"] = QUOTES(m.ContextString)
		event["issueevent_context"] = QUOTES(m.Context)
		event["issueevent_payload"] = QUOTES(m.Payload)
		event["issueevent_url"] = QUOTES(m.URL)
	case *messages.CustomIssue:
		event["customissue_name"] = QUOTES(m.Name)
		event["customissue_payload"] = QUOTES(m.Payload)
	}

	if len(event) == 0 {
		return nil
	}
	event["sessionid"] = fmt.Sprintf("%d", msg.SessionID())
	event["received_at"] = fmt.Sprintf("%d", uint64(time.Now().UnixMilli()))
	event["batch_order_number"] = fmt.Sprintf("%d", 0)
	return event
}

func (s *Saver) handleSession(msg messages.Message) {
	if s.sessions == nil {
		s.sessions = make(map[uint64]map[string]string)
	}
	sess, ok := s.sessions[msg.SessionID()]
	if !ok {
		sess = make(map[string]string)
		sess[`sessionid`] = fmt.Sprintf("%d", msg.SessionID())
	}
	if s.sessions[msg.SessionID()] == nil {
		s.sessions[msg.SessionID()] = make(map[string]string)
		s.sessions[msg.SessionID()][`sessionid`] = fmt.Sprintf("%d", msg.SessionID())
		sess = s.sessions[msg.SessionID()]
	}

	// Parse message and add to session
	switch m := msg.(type) {
	case *messages.SessionStart:
		sess["session_start_timestamp"] = fmt.Sprintf("%d", m.Timestamp)
		sess["user_uuid"] = QUOTES(m.UserUUID)
		sess["user_agent"] = QUOTES(m.UserAgent)
		sess["user_os"] = QUOTES(m.UserOS)
		sess["user_os_version"] = QUOTES(m.UserOSVersion)
		sess["user_browser"] = QUOTES(m.UserBrowser)
		sess["user_browser_version"] = QUOTES(m.UserBrowserVersion)
		sess["user_device"] = QUOTES(m.UserDevice)
		sess["user_device_type"] = QUOTES(m.UserDeviceType)
		sess["user_device_memory_size"] = fmt.Sprintf("%d", m.UserDeviceMemorySize)
		sess["user_device_heap_size"] = fmt.Sprintf("%d", m.UserDeviceHeapSize)
		geoInfo := geoip.UnpackGeoRecord(m.UserCountry)
		sess["user_country"] = QUOTES(geoInfo.Country)
	case *messages.SessionEnd:
		// TODO: load session from cache/db and update some fields
		sess["session_end_timestamp"] = fmt.Sprintf("%d", m.Timestamp)
		// TODO: add duration
	case *messages.ConnectionInformation:
		sess["connection_effective_bandwidth"] = fmt.Sprintf("%d", m.Downlink)
		sess["connection_type"] = QUOTES(m.Type)
	case *messages.Metadata:
		sess["metadata_key"] = QUOTES(m.Key)
		sess["metadata_value"] = QUOTES(m.Value)
	case *messages.PageEvent:
		sess["referrer"] = QUOTES(m.Referrer)
		sess["first_contentful_paint"] = fmt.Sprintf("%d", m.FirstContentfulPaint)
		sess["speed_index"] = fmt.Sprintf("%d", m.SpeedIndex)
		sess["timing_time_to_interactive"] = fmt.Sprintf("%d", m.TimeToInteractive)
		sess["visually_complete"] = fmt.Sprintf("%d", m.VisuallyComplete)
		currUrlsCount, err := strconv.Atoi(sess["urls_count"])
		if err != nil {
			log.Printf("Error converting urls_count to int: %v", err)
			currUrlsCount = 0
		}
		sess["urls_count"] = fmt.Sprintf("%d", currUrlsCount+1)
	case *messages.PerformanceTrackAggr:
		sess["avg_cpu"] = fmt.Sprintf("%d", m.AvgCPU)
		sess["avg_fps"] = fmt.Sprintf("%d", m.AvgFPS)
		sess["max_cpu"] = fmt.Sprintf("%d", m.MaxCPU)
		sess["max_fps"] = fmt.Sprintf("%d", m.MaxFPS)
		sess["max_total_js_heap_size"] = fmt.Sprintf("%d", m.MaxTotalJSHeapSize)
		sess["max_used_js_heap_size"] = fmt.Sprintf("%d", m.MaxUsedJSHeapSize)
	case *messages.UserID:
		if m.ID != "" {
			sess["user_id"] = QUOTES(m.ID)
		}
	case *messages.UserAnonymousID:
		sess["user_anonymous_id"] = QUOTES(m.ID)
	case *messages.JSException, *messages.JSExceptionDeprecated:
		currExceptionsCount, err := strconv.Atoi(sess["js_exceptions_count"])
		if err != nil {
			log.Printf("Error converting js_exceptions_count to int: %v", err)
			currExceptionsCount = 0
		}
		sess["js_exceptions_count"] = fmt.Sprintf("%d", currExceptionsCount+1)
	case *messages.InputEvent:
		currInputsCount, err := strconv.Atoi(sess["inputs_count"])
		if err != nil {
			log.Printf("Error converting inputs_count to int: %v", err)
			currInputsCount = 0
		}
		sess["inputs_count"] = fmt.Sprintf("%d", currInputsCount+1)
	case *messages.MouseClick:
		currMouseClicksCount, err := strconv.Atoi(sess["clicks_count"])
		if err != nil {
			log.Printf("Error converting clicks_count to int: %v", err)
			currMouseClicksCount = 0
		}
		sess["clicks_count"] = fmt.Sprintf("%d", currMouseClicksCount+1)
	case *messages.IssueEvent, *messages.IssueEventDeprecated:
		currIssuesCount, err := strconv.Atoi(sess["issues_count"])
		if err != nil {
			log.Printf("Error converting issues_count to int: %v", err)
			currIssuesCount = 0
		}
		sess["issues_count"] = fmt.Sprintf("%d", currIssuesCount+1)
	}
	s.sessions[msg.SessionID()] = sess
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
	newEvent := handleEvent(msg)
	if newEvent == nil {
		return
	}
	if s.events == nil {
		s.events = make([]map[string]string, 0, 2)
	}
	s.events = append(s.events, newEvent)
	s.handleSession(msg)
	if msg.TypeID() == messages.MsgSessionEnd {
		if s.finishedSessions == nil {
			s.finishedSessions = make([]uint64, 0)
		}
		s.finishedSessions = append(s.finishedSessions, msg.SessionID())
	}
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

func (s *Saver) commitEvents() {
	if len(s.events) == 0 {
		log.Printf("empty events batch")
		return
	}

	// Validate column names // TODO: do it once at the start
	if err := validateColumnNames(eventColumns); err != nil {
		log.Printf("can't validate column names: %s", err)
		return
	}

	// Send data to S3
	fileName := fmt.Sprintf("test_connector/connector_events-%s.csv", uuid.New().String())
	// Create csv file
	buf := eventsToBuffer(s.events)
	s.events = nil

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
}

func sessionsToBuffer(batch []map[string]string) *bytes.Buffer {
	buf := bytes.NewBuffer(nil)

	// Write header
	for _, column := range sessionColumns {
		buf.WriteString(column + "|")
	}
	buf.Truncate(buf.Len() - 1)

	// Write data
	for _, sess := range batch {
		buf.WriteString("\n")
		for _, column := range sessionColumns {
			buf.WriteString(sess[column] + "|")
		}
		buf.Truncate(buf.Len() - 1)
	}
	return buf
}

func (s *Saver) commitSessions() {
	if len(s.finishedSessions) == 0 {
		log.Printf("empty sessions batch")
		return
	}
	sessions := make([]map[string]string, 0, len(s.finishedSessions))
	for _, sessionID := range s.finishedSessions {
		sessions = append(sessions, s.sessions[sessionID])
	}

	// Validate column names // TODO: do it once at the start
	if err := validateColumnNames(sessionColumns); err != nil {
		log.Printf("can't validate column names: %s", err)
		return
	}

	// Send data to S3
	fileName := fmt.Sprintf("test_connector/connector_sessions-%s.csv", uuid.New().String())
	// Create csv file
	buf := sessionsToBuffer(sessions)
	s.events = nil

	reader := bytes.NewReader(buf.Bytes())
	if err := s.objStorage.Upload(reader, fileName, "text/csv", objectstorage.NoCompression); err != nil {
		log.Printf("can't upload file to s3: %s", err)
		return
	}
	// Copy data from s3 bucket to redshift
	if err := s.db.Copy("test_connector_sessions", fileName, "|", true, false); err != nil {
		log.Printf("can't copy data from s3 to redshift: %s", err)
		return
	}
	// Clear current list of finished sessions
	s.finishedSessions = nil
}

// Commit saves batch to Redshift
func (s *Saver) Commit() {
	s.commitEvents()
	s.commitSessions()
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
