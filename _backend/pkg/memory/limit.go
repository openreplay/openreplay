package memory

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
)

const (
	Limit   = "hierarchical_memory_limit"
	Maximum = 9223372036854771712
)

func parseMemoryLimit() (int, error) {
	data, err := os.ReadFile("/sys/fs/cgroup/memory/memory.stat")
	if err != nil {
		return 0, err
	}
	lines := strings.Split(string(data), "\n")
	for _, line := range lines {
		if strings.Contains(line, Limit) {
			lineParts := strings.Split(line, " ")
			if len(lineParts) != 2 {
				return 0, fmt.Errorf("can't split string with memory limit, str: %s", line)
			}
			value, err := strconv.Atoi(lineParts[1])
			if err != nil {
				return 0, fmt.Errorf("can't convert memory limit to int, str: %s", lineParts[1])
			}
			if value == Maximum {
				return 0, errors.New("memory limit is not defined")
			}
			// DEBUG_LOG
			value /= 1024 * 1024
			return value, nil
		}
	}
	return 0, errors.New("memory limit is not defined")
}
