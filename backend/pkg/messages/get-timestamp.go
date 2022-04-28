// Auto-generated, do not edit
package messages

func GetTimestamp(message Message) uint64 {
	switch msg := message.(type) {

	case *IOSBatchMeta:
		return msg.Timestamp

	case *IOSSessionStart:
		return msg.Timestamp

	case *IOSSessionEnd:
		return msg.Timestamp

	case *IOSMetadata:
		return msg.Timestamp

	case *IOSCustomEvent:
		return msg.Timestamp

	case *IOSUserID:
		return msg.Timestamp

	case *IOSUserAnonymousID:
		return msg.Timestamp

	case *IOSScreenChanges:
		return msg.Timestamp

	case *IOSCrash:
		return msg.Timestamp

	case *IOSScreenEnter:
		return msg.Timestamp

	case *IOSScreenLeave:
		return msg.Timestamp

	case *IOSClickEvent:
		return msg.Timestamp

	case *IOSInputEvent:
		return msg.Timestamp

	case *IOSPerformanceEvent:
		return msg.Timestamp

	case *IOSLog:
		return msg.Timestamp

	case *IOSInternalError:
		return msg.Timestamp

	case *IOSNetworkCall:
		return msg.Timestamp

	case *IOSIssueEvent:
		return msg.Timestamp

	}
	return uint64(message.Meta().Timestamp)
}
