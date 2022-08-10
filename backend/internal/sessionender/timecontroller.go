package sessionender

type timeController struct {
	parts         uint64
	lastTimestamp map[uint64]int64 // map[partition]consumerTimeOfLastMessage
}

func NewTimeController(parts int) *timeController {
	return &timeController{
		parts:         uint64(parts),
		lastTimestamp: make(map[uint64]int64),
	}
}

func (tc *timeController) UpdateTime(sessionID uint64, timestamp int64) {
	tc.lastTimestamp[sessionID%tc.parts] = timestamp
}

func (tc *timeController) LastTimestamp(sessionID uint64) int64 {
	return tc.lastTimestamp[sessionID%tc.parts]
}
