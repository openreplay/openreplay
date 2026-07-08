package objectstorage

import (
	"errors"
	"fmt"
	"testing"
)

func TestFatalUploadError(t *testing.T) {
	cause := fmt.Errorf("access denied")
	fatal := &FatalUploadError{StatusCode: 403, Cause: cause}

	// Error message includes status code and cause
	if fatal.Error() != "fatal upload error (HTTP 403): access denied" {
		t.Errorf("unexpected error message: %s", fatal.Error())
	}

	// Unwrap returns cause
	if !errors.Is(fatal, cause) {
		t.Error("Unwrap should return cause")
	}

	// errors.As works
	var target *FatalUploadError
	if !errors.As(fatal, &target) {
		t.Error("errors.As should match FatalUploadError")
	}
	if target.StatusCode != 403 {
		t.Errorf("expected 403, got %d", target.StatusCode)
	}

	// Wrapped in another error, still detectable
	wrapped := fmt.Errorf("upload failed: %w", fatal)
	var target2 *FatalUploadError
	if !errors.As(wrapped, &target2) {
		t.Error("errors.As should match through wrapping")
	}
}

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
