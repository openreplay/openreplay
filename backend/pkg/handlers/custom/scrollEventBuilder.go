package custom

import (
	. "openreplay/backend/pkg/messages"
)

// scrollEventBuilder turns the tracker's ScrollDepth/PageHeight into one
// ScrollEvent per page view: the deepest point reached and the page it was on.
// Tabs of a session interleave their batches, so each tab has its own page view.
type scrollEventBuilder struct {
	tab   string
	pages map[string]*ScrollEvent
}

func NewScrollEventBuilder() *scrollEventBuilder {
	return &scrollEventBuilder{pages: make(map[string]*ScrollEvent)}
}

func (b *scrollEventBuilder) MessageTypes() []int {
	return []int{
		MsgTabData,
		MsgSetPageLocation,
		MsgPageHeight,
		MsgScrollDepth,
	}
}

func (b *scrollEventBuilder) Handle(message Message, timestamp uint64) Message {
	switch message.TypeID() {
	case MsgTabData:
		if msg, ok := message.Decode().(*TabData); ok {
			b.tab = msg.TabId
		}
	case MsgSetPageLocation:
		return b.end(b.tab)
	case MsgPageHeight:
		msg, ok := message.Decode().(*PageHeight)
		if !ok {
			return nil
		}
		ended := b.end(b.tab)
		page := &ScrollEvent{PageHeight: msg.Height, ViewportHeight: msg.ViewportHeight}
		// the page's own url and title, not those of whatever comes when it ends
		page.Meta().SetMeta(message.Meta())
		b.pages[b.tab] = page
		return ended
	case MsgScrollDepth:
		msg, ok := message.Decode().(*ScrollDepth)
		page := b.pages[b.tab]
		if !ok || page == nil {
			return nil
		}
		if page.Timestamp == 0 || msg.Percent > page.Percent {
			page.Percent = msg.Percent
			page.Timestamp = message.Time()
			page.MessageID = message.MsgID()
		}
	}
	return nil
}

func (b *scrollEventBuilder) end(tab string) Message {
	page := b.pages[tab]
	delete(b.pages, tab)
	if page == nil || page.Timestamp == 0 {
		return nil
	}
	return page
}

// Build returns one open page view per call, nil once none is left.
func (b *scrollEventBuilder) Build() Message {
	for tab := range b.pages {
		if page := b.end(tab); page != nil {
			return page
		}
	}
	return nil
}
