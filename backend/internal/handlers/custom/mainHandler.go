package custom

import (
	"net/url"
	"openreplay/backend/pkg/intervals"
	"strings"
	"time"

	. "openreplay/backend/pkg/messages"
)

func getURLExtention(URL string) string {
	u, err := url.Parse(URL)
	if err != nil {
		return ""
	}
	i := strings.LastIndex(u.Path, ".")
	return u.Path[i+1:]
}

func getResourceType(initiator string, URL string) string {
	switch initiator {
	case "xmlhttprequest", "fetch":
		return "fetch"
	case "img":
		return "img"
	default:
		switch getURLExtention(URL) {
		case "css":
			return "stylesheet"
		case "js":
			return "script"
		case "png", "gif", "jpg", "jpeg", "svg":
			return "img"
		case "mp4", "mkv", "ogg", "webm", "avi", "mp3":
			return "media"
		default:
			return "other"
		}
	}
}

type builder struct {
	readyMsgs              []Message
	timestamp              uint64
	lastProcessedTimestamp int64
	peBuilder              *pageEventBuilder
	ieBuilder              *inputEventBuilder
	integrationsWaiting    bool
	sid                    uint64
}

func (b *builder) Build() Message {
	//TODO implement me
	panic("implement me")
}

func NewMainHandler() *builder {
	return &builder{
		peBuilder:           &pageEventBuilder{},
		ieBuilder:           NewInputEventBuilder(),
		integrationsWaiting: true,
	}
}

func (b *builder) appendReadyMessage(msg Message) { // interface is never nil even if it holds nil value
	b.readyMsgs = append(b.readyMsgs, msg)
}

func (b *builder) iterateReadyMessage(iter func(msg Message)) {
	for _, readyMsg := range b.readyMsgs {
		iter(readyMsg)
	}
	b.readyMsgs = nil
}

func (b *builder) buildPageEvent() {
	if msg := b.peBuilder.Build(); msg != nil {
		b.appendReadyMessage(msg)
	}
}

func (b *builder) buildInputEvent() {
	if msg := b.ieBuilder.Build(); msg != nil {
		b.appendReadyMessage(msg)
	}
}

func (b *builder) Handle(message Message, messageID uint64, timestamp uint64) Message {
	b.timestamp = timestamp
	b.lastProcessedTimestamp = time.Now().UnixMilli()

	// Might happen before  the first timestamp.
	switch msg := message.(type) {
	case *SessionStart,
		*Metadata,
		*UserID,
		*UserAnonymousID:
		b.appendReadyMessage(msg)
	case *RawErrorEvent:
		b.appendReadyMessage(&ErrorEvent{
			MessageID: messageID,
			Timestamp: msg.Timestamp,
			Source:    msg.Source,
			Name:      msg.Name,
			Message:   msg.Message,
			Payload:   msg.Payload,
		})
	}
	if b.timestamp == 0 {
		return nil
	}
	switch msg := message.(type) {
	case *SetPageLocation:
		if msg.NavigationStart == 0 {
			b.appendReadyMessage(&PageEvent{
				URL:       msg.URL,
				Referrer:  msg.Referrer,
				Loaded:    false,
				MessageID: messageID,
				Timestamp: b.timestamp,
			})
		} else {
			b.buildPageEvent()
			b.buildInputEvent()
			b.ieBuilder.ClearLabels()
			b.peBuilder.HandleSetPageLocation(msg, messageID, b.timestamp)
		}
	case *PageLoadTiming:
		if rm := b.peBuilder.HandlePageLoadTiming(msg); rm != nil {
			b.appendReadyMessage(rm)
		}
	case *PageRenderTiming:
		if rm := b.peBuilder.HandlePageRenderTiming(msg); rm != nil {
			b.appendReadyMessage(rm)
		}
	case *SetInputTarget:
		if rm := b.ieBuilder.HandleSetInputTarget(msg); rm != nil {
			b.appendReadyMessage(rm)
		}
	case *SetInputValue:
		if rm := b.ieBuilder.HandleSetInputValue(msg, messageID, b.timestamp); rm != nil {
			b.appendReadyMessage(rm)
		}
	case *MouseClick:
		b.buildInputEvent()
		if msg.Label != "" {
			b.appendReadyMessage(&ClickEvent{
				MessageID:      messageID,
				Label:          msg.Label,
				HesitationTime: msg.HesitationTime,
				Timestamp:      b.timestamp,
				Selector:       msg.Selector,
			})
		}
	case *JSException:
		b.appendReadyMessage(&ErrorEvent{
			MessageID: messageID,
			Timestamp: b.timestamp,
			Source:    "js_exception",
			Name:      msg.Name,
			Message:   msg.Message,
			Payload:   msg.Payload,
		})
	case *ResourceTiming:
		tp := getResourceType(msg.Initiator, msg.URL)
		success := msg.Duration != 0
		b.appendReadyMessage(&ResourceEvent{
			MessageID:       messageID,
			Timestamp:       msg.Timestamp,
			Duration:        msg.Duration,
			TTFB:            msg.TTFB,
			HeaderSize:      msg.HeaderSize,
			EncodedBodySize: msg.EncodedBodySize,
			DecodedBodySize: msg.DecodedBodySize,
			URL:             msg.URL,
			Type:            tp,
			Success:         success,
		})
		if !success {
			issueType := "missing_resource"
			if tp == "fetch" {
				issueType = "bad_request"
			}
			b.appendReadyMessage(&IssueEvent{
				Type:          issueType,
				MessageID:     messageID,
				Timestamp:     msg.Timestamp,
				ContextString: msg.URL,
			})
		}
	case *RawCustomEvent:
		b.appendReadyMessage(&CustomEvent{
			MessageID: messageID,
			Timestamp: b.timestamp,
			Name:      msg.Name,
			Payload:   msg.Payload,
		})
	case *CustomIssue:
		b.appendReadyMessage(&IssueEvent{
			Type:          "custom",
			Timestamp:     b.timestamp,
			MessageID:     messageID,
			ContextString: msg.Name,
			Payload:       msg.Payload,
		})
	case *Fetch:
		b.appendReadyMessage(&FetchEvent{
			MessageID: messageID,
			Timestamp: msg.Timestamp,
			Method:    msg.Method,
			URL:       msg.URL,
			Request:   msg.Request,
			Response:  msg.Response,
			Status:    msg.Status,
			Duration:  msg.Duration,
		})
		if msg.Status >= 400 {
			b.appendReadyMessage(&IssueEvent{
				Type:          "bad_request",
				MessageID:     messageID,
				Timestamp:     msg.Timestamp,
				ContextString: msg.URL,
			})
		}
	case *GraphQL:
		b.appendReadyMessage(&GraphQLEvent{
			MessageID:     messageID,
			Timestamp:     b.timestamp,
			OperationKind: msg.OperationKind,
			OperationName: msg.OperationName,
			Variables:     msg.Variables,
			Response:      msg.Response,
		})
	case *StateAction:
		b.appendReadyMessage(&StateActionEvent{
			MessageID: messageID,
			Timestamp: b.timestamp,
			Type:      msg.Type,
		})
	}
	return nil
}

func (b *builder) checkTimeouts(ts int64) bool {
	if b.timestamp == 0 {
		return false // There was no timestamp events yet
	}

	if b.peBuilder.HasInstance() && int64(b.peBuilder.GetTimestamp())+intervals.EVENTS_PAGE_EVENT_TIMEOUT < ts {
		b.buildPageEvent()
	}
	if b.ieBuilder.HasInstance() && int64(b.ieBuilder.GetTimestamp())+intervals.EVENTS_INPUT_EVENT_TIMEOUT < ts {
		b.buildInputEvent()
	}
	return false
}
