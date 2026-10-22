package scheduler

import (
	"fmt"
	"strings"

	"github.com/robfig/cron/v3"
)

// Overrides holds the per-cron configuration coming from the environment:
//   - CRON_SCHEDULES: comma-separated "<name> <cron expression>" pairs,
//     e.g. "alerts * * * * *, other 0 5 * * 1".
//   - CRON_DISABLED: comma-separated cron names, e.g. "alerts,other".
type Overrides struct {
	Schedules map[string]string   // name -> validated expression
	Disabled  map[string]struct{} // names to disable
}

// ParseOverrides parses both env vars. It never fails on CRON_DISABLED; it fails on
// CRON_SCHEDULES entries that are malformed, invalid or duplicated.
func ParseOverrides(schedules, disabled string) (Overrides, error) {
	s, err := ParseSchedules(schedules)
	if err != nil {
		return Overrides{}, err
	}
	return Overrides{Schedules: s, Disabled: ParseDisabled(disabled)}, nil
}

// ParseSchedules parses CRON_SCHEDULES. Entries are separated by ",", the first
// whitespace-separated token of an entry is the cron name (case-insensitive) and the
// remaining tokens form the expression. Empty entries are skipped. Because "," separates
// entries, list syntax inside an expression (e.g. "0 5 * * 1,3") is not expressible;
// use ranges ("1-3") or steps ("*/2") instead.
func ParseSchedules(raw string) (map[string]string, error) {
	out := make(map[string]string)
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return out, nil
	}
	for _, piece := range strings.Split(raw, ",") {
		piece = strings.TrimSpace(piece)
		if piece == "" {
			continue
		}
		fields := strings.Fields(piece)
		if len(fields) < 2 {
			return nil, fmt.Errorf("CRON_SCHEDULES entry %q: expected \"<name> <cron expression>\"", piece)
		}
		name := strings.ToLower(fields[0])
		expr := strings.Join(fields[1:], " ")
		if _, err := cron.ParseStandard(expr); err != nil {
			return nil, fmt.Errorf("CRON_SCHEDULES entry %q: invalid expression %q: %w", piece, expr, err)
		}
		if _, dup := out[name]; dup {
			return nil, fmt.Errorf("CRON_SCHEDULES: duplicate entry for %q", name)
		}
		out[name] = expr
	}
	return out, nil
}

// ParseDisabled parses CRON_DISABLED into a set of lowercase cron names.
func ParseDisabled(raw string) map[string]struct{} {
	out := make(map[string]struct{})
	for _, piece := range strings.Split(raw, ",") {
		name := strings.ToLower(strings.TrimSpace(piece))
		if name == "" {
			continue
		}
		out[name] = struct{}{}
	}
	return out
}
