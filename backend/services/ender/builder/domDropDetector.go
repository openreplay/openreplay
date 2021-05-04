package builder

import (
	. "openreplay/backend/pkg/messages"
)


type domDropDetector struct {
	removedCount  int
	lastDropTimestamp uint64
}

const DROP_WINDOW = 200 //ms
const CRITICAL_COUNT = 1  // Our login page contains 20. But on crush it removes only roots (1-3 nodes).

func (dd *domDropDetector) HandleNodeCreation() {
	dd.removedCount = 0
	dd.lastDropTimestamp = 0
}

func (dd *domDropDetector) HandleNodeRemoval(ts uint64) {
	if dd.lastDropTimestamp + DROP_WINDOW > ts {
		dd.removedCount += 1
	} else {
		dd.removedCount = 1
	}
	dd.lastDropTimestamp = ts
}


func (dd *domDropDetector) Build() *DOMDrop {
	var domDrop *DOMDrop
	if dd.removedCount >= CRITICAL_COUNT {
		domDrop = &DOMDrop{
			Timestamp: dd.lastDropTimestamp,
		}
	}
	dd.removedCount = 0
	dd.lastDropTimestamp = 0
	return domDrop
}

