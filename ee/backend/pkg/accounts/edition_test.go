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

func TestOptionalSettingsDoNotExit(t *testing.T) {
	for _, key := range []string{"SAML2_MD_URL", "idp_entityId", "idp_sso_url", "idp_x509cert", "iceServers", "assist_secret", "assist_ttl"} {
		t.Setenv(key, "")
	}
	if saml2Available() {
		t.Fatalf("saml2 must be unavailable without settings")
	}
	if got := withLegacy("", "iceServers"); got != "" {
		t.Fatalf("got %q, want empty", got)
	}
	if got := assistTTL(0); got != 48 {
		t.Fatalf("an unset ttl must default to 48, got %d", got)
	}

	t.Setenv("idp_entityId", "e")
	t.Setenv("idp_sso_url", "u")
	t.Setenv("idp_x509cert", "c")
	if !saml2Available() {
		t.Fatalf("saml2 must be available with idp settings")
	}
}

func TestLegacyAssistSettings(t *testing.T) {
	t.Setenv("iceServers", "stun:legacy.example.com")
	t.Setenv("assist_ttl", "12")
	if got := withLegacy("", "iceServers"); got != "stun:legacy.example.com" {
		t.Fatalf("legacy iceServers must be used as a fallback, got %q", got)
	}
	if got := withLegacy("turn:new.example.com", "iceServers"); got != "turn:new.example.com" {
		t.Fatalf("the Go setting must win, got %q", got)
	}
	if got := assistTTL(0); got != 12 {
		t.Fatalf("legacy assist_ttl must apply when ASSIST_TTL is unset, got %d", got)
	}
	if got := assistTTL(24); got != 24 {
		t.Fatalf("a configured ASSIST_TTL must win over assist_ttl, got %d", got)
	}
	t.Setenv("assist_ttl", "0")
	if got := assistTTL(0); got != 48 {
		t.Fatalf("a non-positive assist_ttl must fall back to 48, got %d", got)
	}
}
