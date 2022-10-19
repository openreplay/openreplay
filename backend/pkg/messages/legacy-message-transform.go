package messages

func transformDeprecated(msg Message) Message {
	switch m := msg.(type) {
	case *JSExceptionDeprecated:
		return &JSException{
			Name:     m.Name,
			Message:  m.Message,
			Payload:  m.Payload,
			Metadata: "{}",
		}
	}
	return msg
}
