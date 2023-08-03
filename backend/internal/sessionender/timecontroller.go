package sessionender

type timeController struct {
	parts               uint64
	lastBatchTimestamp  map[uint64]int64 // map[partition]consumerTimeOfLastMessage
	lastUpdateTimestamp map[uint64]int64 // map[partition]systemTimeOfLastMessage
}

func NewTimeController(parts int) *timeController {
	return &timeController{
		parts:               uint64(parts),
		lastBatchTimestamp:  make(map[uint64]int64),
		lastUpdateTimestamp: make(map[uint64]int64),
	}
}

func (tc *timeController) UpdateTime(sessionID uint64, batchTimestamp, updateTimestamp int64) {
	tc.lastBatchTimestamp[sessionID%tc.parts] = batchTimestamp
	tc.lastUpdateTimestamp[sessionID%tc.parts] = updateTimestamp
}

func (tc *timeController) LastBatchTimestamp(sessionID uint64) int64 {
	return tc.lastBatchTimestamp[sessionID%tc.parts]
}

func (tc *timeController) LastUpdateTimestamp(sessionID uint64) int64 {
	return tc.lastUpdateTimestamp[sessionID%tc.parts]
}
