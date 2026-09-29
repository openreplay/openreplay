package dashboards

import "testing"

func intPtr(v int) *int { return &v }

func TestEvaluateAccess(t *testing.T) {
	tests := []struct {
		name     string
		ownerID  *int
		isPublic bool
		userID   uint64
		wantErr  string
	}{
		{"public non-owner", intPtr(1), true, 2, ""},
		{"public nil owner", nil, true, 2, ""},
		{"private owner", intPtr(7), false, 7, ""},
		{"private non-owner", intPtr(7), false, 8, errAccessDenied},
		{"private nil owner", nil, false, 8, errAccessDenied},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := evaluateAccess(tt.ownerID, tt.isPublic, tt.userID)
			got := ""
			if err != nil {
				got = err.Error()
			}
			if got != tt.wantErr {
				t.Fatalf("got %q, want %q", got, tt.wantErr)
			}
		})
	}
}

func TestErrorStrings(t *testing.T) {
	if errNotFound != "not_found: dashboard not found" {
		t.Fatalf("errNotFound = %q", errNotFound)
	}
	if errAccessDenied != "access_denied: user does not have access" {
		t.Fatalf("errAccessDenied = %q", errAccessDenied)
	}
}
