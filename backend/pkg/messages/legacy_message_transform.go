package messages


func transformDepricated(msg Message) Message {
	switch m := msg.(type) {
	case *MouseClickDepricated:
		meta :=  m.Meta()
		meta.TypeID = 33
		return &MouseClick{
			meta: meta,
			ID: m.ID,
			HesitationTime: m.HesitationTime,
			Label: m.Label,
			// Selector: '',
		}
	// case *FetchDepricated:
	// 	return &Fetch {
 //  		Method: m.Method,
	// 		URL: m.URL,
	// 		Request: m.Request,
	// 		Response: m.Response,
	// 		Status: m.Status,
	// 		Timestamp: m.Timestamp,
	// 		Duration: m.Duration,
	// 		// Headers: ''
	// 	}
	default:
	 return msg
	}
}


