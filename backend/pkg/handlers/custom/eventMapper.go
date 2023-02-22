package custom

import (
	"net/url"
	"strings"

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

type EventMapper struct{}

func (b *EventMapper) Build() Message {
	return nil
}

func (b *EventMapper) Handle(message Message, timestamp uint64) Message {
	switch msg := message.(type) {
	case *MouseClick:
		if msg.Label != "" {
			return &ClickEvent{
				MessageID:      message.MessageID(),
				Label:          msg.Label,
				HesitationTime: msg.HesitationTime,
				Timestamp:      timestamp,
				Selector:       msg.Selector,
			}
		}
	case *ResourceTiming:
		return &ResourceEvent{
			MessageID:       message.MessageID(),
			Timestamp:       msg.Timestamp,
			Duration:        msg.Duration,
			TTFB:            msg.TTFB,
			HeaderSize:      msg.HeaderSize,
			EncodedBodySize: msg.EncodedBodySize,
			DecodedBodySize: msg.DecodedBodySize,
			URL:             msg.URL,
			Type:            getResourceType(msg.Initiator, msg.URL),
			Success:         msg.Duration != 0,
		}
	case *CustomIssue:
		return &IssueEvent{
			Type:          "custom",
			Timestamp:     timestamp,
			MessageID:     message.MessageID(),
			ContextString: msg.Name,
			Payload:       msg.Payload,
		}
	}
	return nil
}
