package player

import "testing"

func TestPlayer(t *testing.T) {
	player := New()
	if err := player.LoadRecord("/Users/alexander/7048055123532800"); err != nil {
		t.Logf("can't load session record: %s", err)
	}
}
