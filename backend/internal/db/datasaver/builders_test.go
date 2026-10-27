package datasaver

import (
	"testing"

	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/messages"
)

func TestFlushDrainsEveryPendingEvent(t *testing.T) {
	const sessionID = 42
	var scrolls []*messages.ScrollEvent
	bs := newBuilders(logger.New(), func(m messages.Message) {
		if ev, ok := m.(*messages.ScrollEvent); ok {
			scrolls = append(scrolls, ev)
		}
	})
	batch := messages.NewBatchInfo(sessionID, "raw", 1, 0, 0)
	var index, ts uint64 = 0, 1_000_000
	send := func(m messages.Message) {
		index++
		ts += 100
		m.Meta().SetBatchInfo(batch)
		m.Meta().Index = index
		m.Meta().Timestamp = ts
		bs.Handle(m)
	}

	// two tabs still on their pages when the session ends
	for _, tab := range []string{"a", "b"} {
		send(&messages.TabData{TabId: tab})
		send(&messages.PageHeight{Height: 3000, ViewportHeight: 1000})
		send(&messages.ScrollDepth{Percent: 40})
	}
	send(&messages.SessionEnd{Timestamp: ts})

	if len(scrolls) != 2 {
		t.Fatalf("got %d scroll events, want one per tab (2)", len(scrolls))
	}
	for _, ev := range scrolls {
		if ev.SessionID() != sessionID {
			t.Errorf("got session %d, want %d", ev.SessionID(), sessionID)
		}
	}
}
