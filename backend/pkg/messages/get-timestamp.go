// Auto-generated, do not edit
package messages

func GetTimestamp(message Message) uint64 {
	switch msg := message.(type) {

	case *MobileSessionStart:
		return msg.Timestamp

	case *MobileSessionEnd:
		return msg.Timestamp

	case *MobileMetadata:
		return msg.Timestamp

	case *MobileEvent:
		return msg.Timestamp

	case *MobileUserID:
		return msg.Timestamp

	case *MobileUserAnonymousID:
		return msg.Timestamp

	case *MobileScreenChanges:
		return msg.Timestamp

	case *MobileCrash:
		return msg.Timestamp

	case *MobileViewComponentEvent:
		return msg.Timestamp

	case *MobileClickEvent:
		return msg.Timestamp

	case *MobileInputEvent:
		return msg.Timestamp

	case *MobilePerformanceEvent:
		return msg.Timestamp

	case *MobileLog:
		return msg.Timestamp

	case *MobileInternalError:
		return msg.Timestamp

	case *MobileNetworkCall:
		return msg.Timestamp

	case *MobileSwipeEvent:
		return msg.Timestamp

	case *MobileBatchMeta:
		return msg.Timestamp

	case *MobileIssueEvent:
		return msg.Timestamp

	}
	return uint64(message.Meta().Timestamp)
}
