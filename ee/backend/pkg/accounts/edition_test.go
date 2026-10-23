package accounts

import (
	"crypto/hmac"
	"crypto/sha1"
	"encoding/base64"
	"encoding/json"
	"reflect"
	"testing"
	"time"
)

func TestIceServersWithoutSecret(t *testing.T) {
	got, err := iceServers("stun:stun.example.com:3478|turn:turn.example.com:3478,user,pass|turn:other.example.com", "", 48, time.Now())
	if err != nil {
		t.Fatalf("unexpected error: %s", err)
	}
	want := []iceServer{
		{URLs: "stun:stun.example.com:3478"},
		{URLs: "turn:turn.example.com:3478", Username: "user", Credential: "pass"},
		{URLs: "turn:other.example.com"},
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("got %+v, want %+v", got, want)
	}
}

func TestIceServersWithSecret(t *testing.T) {
	now := time.Unix(1_800_000_000, 0)
	got, err := iceServers("STUN:stun.example.com|turn:turn.example.com:3478,ignored,ignored", "s3cret", 2, now)
	if err != nil {
		t.Fatalf("unexpected error: %s", err)
	}
	if len(got) != 2 || got[0] != (iceServer{URLs: "STUN:stun.example.com"}) {
		t.Fatalf("stun entries must carry no credentials: %+v", got)
	}
	turn := got[1]
	if turn.URLs != "turn:turn.example.com:3478" || turn.Username[:11] != "1800007200:" {
		t.Fatalf("unexpected turn entry: %+v", turn)
	}
	mac := hmac.New(sha1.New, []byte("s3cret"))
	mac.Write([]byte(turn.Username))
	if turn.Credential != base64.StdEncoding.EncodeToString(mac.Sum(nil)) {
		t.Fatalf("credential is not the HMAC-SHA1 of the username")
	}
}

func TestIceServersEmptyIsNull(t *testing.T) {
	got, err := iceServers("", "s3cret", 48, time.Now())
	if err != nil {
		t.Fatalf("unexpected error: %s", err)
	}
	body, _ := json.Marshal(got)
	if string(body) != "null" {
		t.Fatalf("unset ice servers must serialize as null, got %s", body)
	}
}

func TestEEAccountJSON(t *testing.T) {
	account := &Account{
		userInfo:     userInfo{UserID: 3, Settings: map[string]any{"modules": []any{}}},
		userExtra:    userExtra{Permissions: []string{"SESSION_REPLAY"}},
		tenantInfo:   tenantInfo{TenantID: 4},
		accountExtra: accountExtra{SAML2: true},
	}
	body, _ := json.Marshal(account)
	var fields map[string]any
	if err := json.Unmarshal(body, &fields); err != nil {
		t.Fatalf("unmarshal: %s", err)
	}
	for _, key := range []string{"permissions", "roleId", "roleName", "origin", "allProjects", "serviceAccount", "saml2", "tenantId"} {
		if _, ok := fields[key]; !ok {
			t.Fatalf("%s must be present in EE: %s", key, body)
		}
	}
	if fields["tenantId"] != 4.0 {
		t.Fatalf("tenantId must come from the tenant: %s", body)
	}
}
