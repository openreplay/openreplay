package messages

func transformDeprecated(msg Message) Message {
	switch m := msg.(type) {
	case *MouseClickDepricated:
		meta := m.Meta()
		meta.TypeID = 33
		return &MouseClick{
			meta:           meta,
			ID:             m.ID,
			HesitationTime: m.HesitationTime,
			Label:          m.Label,
		}
	default:
		return msg
	}
}
