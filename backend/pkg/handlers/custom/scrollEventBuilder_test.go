package custom

import (
	"testing"

	. "openreplay/backend/pkg/messages"
)

type scrollFeed struct {
	t     *testing.T
	b     *scrollEventBuilder
	index uint64
	ts    uint64
	url   string
}

func newScrollFeed(t *testing.T) *scrollFeed {
	return &scrollFeed{t: t, b: NewScrollEventBuilder(), ts: 1_000_000, url: "https://site.com/"}
}

// send hands msg to the builder the way the iterator would: own index, time and current url.
func (f *scrollFeed) send(msg Message) *ScrollEvent {
	f.index++
	f.ts += 100
	if loc, ok := msg.(*SetPageLocation); ok {
		f.url = loc.URL
	}
	msg.Meta().SetBatchInfo(NewBatchInfo(7, "raw", 1, 0, 0))
	msg.Meta().Index = f.index
	msg.Meta().Timestamp = f.ts
	msg.Meta().Url = f.url
	return asScroll(f.t, f.b.Handle(msg, f.ts))
}

func asScroll(t *testing.T, m Message) *ScrollEvent {
	if m == nil {
		return nil
	}
	ev, ok := m.(*ScrollEvent)
	if !ok {
		t.Fatalf("got %T, want *ScrollEvent", m)
	}
	return ev
}

func TestScrollEventOnePerPageView(t *testing.T) {
	f := newScrollFeed(t)
	f.send(&TabData{TabId: "a"})
	f.send(&SetPageLocation{URL: "https://site.com/pricing"})
	f.send(&PageHeight{Height: 4000, ViewportHeight: 1000})
	pageAt := f.index
	f.send(&ScrollDepth{Percent: 25})
	f.send(&ScrollDepth{Percent: 60})
	deepestAt, deepestTs := f.index, f.ts
	f.send(&ScrollDepth{Percent: 40})

	ev := f.send(&SetPageLocation{URL: "https://site.com/next"})
	if ev == nil {
		t.Fatal("no event when the page ended")
	}
	if ev.Percent != 60 || ev.PageHeight != 4000 || ev.ViewportHeight != 1000 {
		t.Errorf("got %d%% of %d (window %d), want 60%% of 4000 (window 1000)", ev.Percent, ev.PageHeight, ev.ViewportHeight)
	}
	if ev.Timestamp != deepestTs || ev.MessageID != deepestAt {
		t.Errorf("got time %d id %d, want the deepest point's %d / %d", ev.Timestamp, ev.MessageID, deepestTs, deepestAt)
	}
	if ev.Url != "https://site.com/pricing" || ev.Meta().Index != pageAt || !HasMeta(ev) {
		t.Errorf("got url %q index %d, want the page's own url and index %d", ev.Url, ev.Meta().Index, pageAt)
	}
	if f.b.Build() != nil {
		t.Error("the ended page view was built again")
	}
}

func TestScrollEventTabsKeepTheirOwnPage(t *testing.T) {
	f := newScrollFeed(t)
	f.send(&TabData{TabId: "a"})
	f.send(&SetPageLocation{URL: "https://site.com/a"})
	f.send(&PageHeight{Height: 3000, ViewportHeight: 1000})
	f.send(&ScrollDepth{Percent: 30})
	f.send(&TabData{TabId: "b"})
	f.send(&SetPageLocation{URL: "https://site.com/b"})
	f.send(&PageHeight{Height: 2000, ViewportHeight: 1000})
	f.send(&ScrollDepth{Percent: 50})
	f.send(&TabData{TabId: "a"})
	f.send(&ScrollDepth{Percent: 90})
	f.send(&TabData{TabId: "b"})

	b := f.send(&SetPageLocation{URL: "https://site.com/b2"})
	if b == nil || b.Url != "https://site.com/b" || b.Percent != 50 {
		t.Fatalf("tab b: got %+v, want /b at 50%%", b)
	}
	a := asScroll(t, f.b.Build())
	if a == nil || a.Url != "https://site.com/a" || a.Percent != 90 {
		t.Fatalf("tab a at session end: got %+v, want /a at 90%%", a)
	}
	if f.b.Build() != nil {
		t.Error("more page views than tabs")
	}
}

func TestScrollEventNeedsPageAndDepth(t *testing.T) {
	f := newScrollFeed(t)
	f.send(&SetPageLocation{URL: "https://site.com/"})
	f.send(&ScrollDepth{Percent: 80}) // before its page's height: not a page view yet
	f.send(&PageHeight{Height: 3000, ViewportHeight: 1000})
	if ev := f.send(&SetPageLocation{URL: "https://site.com/next"}); ev != nil {
		t.Errorf("got %+v for a page without any depth", ev)
	}

	f.send(&PageHeight{Height: 50000, ViewportHeight: 1000})
	f.send(&ScrollDepth{Percent: 0})
	ev := asScroll(t, f.b.Build())
	if ev == nil || ev.Percent != 0 {
		t.Errorf("got %+v, want the page view at 0%%", ev)
	}
}

func TestScrollEventNewHeightStartsNewPage(t *testing.T) {
	f := newScrollFeed(t)
	f.send(&PageHeight{Height: 3000, ViewportHeight: 1000})
	f.send(&ScrollDepth{Percent: 70})
	ev := f.send(&PageHeight{Height: 5000, ViewportHeight: 1000})
	if ev == nil || ev.Percent != 70 || ev.PageHeight != 3000 {
		t.Fatalf("got %+v, want the previous page view at 70%% of 3000", ev)
	}
	f.send(&ScrollDepth{Percent: 20})
	if ev := asScroll(t, f.b.Build()); ev == nil || ev.Percent != 20 || ev.PageHeight != 5000 {
		t.Errorf("got %+v, want the new page view at 20%% of 5000", ev)
	}
}
