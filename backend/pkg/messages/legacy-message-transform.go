package messages

func transformDeprecated(msg Message) Message {
	switch m := msg.(type) {
	case *MouseClickDepricated:
		return &MouseClick{
			ID:             m.ID,
			HesitationTime: m.HesitationTime,
			Label:          m.Label,
		}
	default:
		return msg
	}
}
