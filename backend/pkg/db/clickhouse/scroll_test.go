package clickhouse

import "testing"

func TestScrollFoldPct(t *testing.T) {
	cases := []struct{ page, window, want uint64 }{
		{4000, 1000, 25},
		{3000, 1000, 33},
		{1500, 1000, 67},
		{800, 1000, 100},
		{0, 1000, 100},
	}
	for _, c := range cases {
		if got := scrollFoldPct(c.page, c.window); got != c.want {
			t.Errorf("scrollFoldPct(%d, %d) = %d, want %d", c.page, c.window, got, c.want)
		}
	}
}
