package s3

import (
	"fmt"
	"testing"

	"github.com/aws/aws-sdk-go/aws/awserr"
)

func TestIsFatalS3Error(t *testing.T) {
	tests := []struct {
		name  string
		err   error
		fatal bool
	}{
		// HTTP 401/403 — always fatal
		{
			name:  "403 AccessDenied",
			err:   awserr.NewRequestFailure(awserr.New("AccessDenied", "Access Denied", nil), 403, "req-1"),
			fatal: true,
		},
		{
			name:  "401 Unauthorized",
			err:   awserr.NewRequestFailure(awserr.New("Unauthorized", "Unauthorized", nil), 401, "req-2"),
			fatal: true,
		},
		{
			name:  "403 InvalidAccessKeyId",
			err:   awserr.NewRequestFailure(awserr.New("InvalidAccessKeyId", "key not found", nil), 403, "req-3"),
			fatal: true,
		},
		{
			name:  "403 SignatureDoesNotMatch",
			err:   awserr.NewRequestFailure(awserr.New("SignatureDoesNotMatch", "bad sig", nil), 403, "req-4"),
			fatal: true,
		},
		// Expired creds — HTTP 400 but fatal (SDK exhausted retry+refresh)
		{
			name:  "400 ExpiredToken",
			err:   awserr.NewRequestFailure(awserr.New("ExpiredToken", "token expired", nil), 400, "req-5"),
			fatal: true,
		},
		{
			name:  "400 ExpiredTokenException",
			err:   awserr.NewRequestFailure(awserr.New("ExpiredTokenException", "token expired", nil), 400, "req-6"),
			fatal: true,
		},
		{
			name:  "400 RequestExpired",
			err:   awserr.NewRequestFailure(awserr.New("RequestExpired", "request expired", nil), 400, "req-7"),
			fatal: true,
		},
		// Non-fatal errors
		{
			name:  "404 NoSuchKey",
			err:   awserr.NewRequestFailure(awserr.New("NoSuchKey", "not found", nil), 404, "req-8"),
			fatal: false,
		},
		{
			name:  "500 InternalError",
			err:   awserr.NewRequestFailure(awserr.New("InternalError", "server error", nil), 500, "req-9"),
			fatal: false,
		},
		{
			name:  "400 non-auth error",
			err:   awserr.NewRequestFailure(awserr.New("MalformedXML", "bad xml", nil), 400, "req-10"),
			fatal: false,
		},
		{
			name:  "generic error",
			err:   fmt.Errorf("connection refused"),
			fatal: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := isFatalS3Error(tt.err); got != tt.fatal {
				t.Errorf("isFatalS3Error() = %v, want %v", got, tt.fatal)
			}
		})
	}
}
