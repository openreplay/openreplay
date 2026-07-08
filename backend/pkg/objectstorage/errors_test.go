package objectstorage

import (
	"testing"
)

func TestIsFatalStatusCode(t *testing.T) {
	tests := []struct {
		code  int
		fatal bool
	}{
		{200, false},
		{400, false},
		{401, true},
		{403, true},
		{404, false},
		{500, false},
	}
	for _, tt := range tests {
		if got := IsFatalStatusCode(tt.code); got != tt.fatal {
			t.Errorf("IsFatalStatusCode(%d) = %v, want %v", tt.code, got, tt.fatal)
		}
	}
}
