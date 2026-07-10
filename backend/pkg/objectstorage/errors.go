package objectstorage

import "fmt"

// FatalUploadError wraps upload errors that indicate non-recoverable auth failures (401/403).
// Callers should terminate the process when encountering this error.
type FatalUploadError struct {
	StatusCode int
	Cause      error
}

func (e *FatalUploadError) Error() string {
	return fmt.Sprintf("fatal upload error (HTTP %d): %v", e.StatusCode, e.Cause)
}

func (e *FatalUploadError) Unwrap() error {
	return e.Cause
}

// IsFatalStatusCode returns true for HTTP status codes indicating credential/auth failure.
func IsFatalStatusCode(code int) bool {
	return code == 401 || code == 403
}
