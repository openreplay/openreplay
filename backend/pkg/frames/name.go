package frames

import (
	"fmt"
	"path/filepath"
	"strconv"
	"strings"
)

// Example "1771238515501_33.webp" -> ("1771238515501.webp", 33).
func ParseFrameName(name string) (baseName string, ts uint64, err error) {
	ext := filepath.Ext(name)
	trimmed := strings.TrimSuffix(name, ext)
	// Last segment after '_' is the timestamp.
	idx := strings.LastIndex(trimmed, "_")
	if idx < 0 {
		return "", 0, fmt.Errorf("frame name has no underscore: %s", name)
	}
	baseName = trimmed[:idx] + ext
	ts, err = strconv.ParseUint(trimmed[idx+1:], 10, 64)
	if err != nil {
		return "", 0, fmt.Errorf("can't parse timestamp from frame name %s: %w", name, err)
	}
	return baseName, ts, nil
}
