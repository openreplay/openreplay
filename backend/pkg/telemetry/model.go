package telemetry

// Port of chalicelib/core/telemetry.compute (CE and EE): once a day, refresh the usage
// counters stored on public.tenants and report them to api.openreplay.com.

// TenantStats is one row returned by the counters update (see storage_tenant.go).
type TenantStats struct {
	Name         string
	Integrations int64
	Projects     int64
	Sessions     int64
	Users        int64
	TenantKey    string
	OptOut       bool
	Version      string
	OwnerEmail   *string
}

// Stat is the wire format of telemetry.process_data.
type Stat struct {
	Edition           string  `json:"edition"`
	Tracking          bool    `json:"tracking"`
	Version           string  `json:"version"`
	UserID            string  `json:"user_id"`
	TenantKey         string  `json:"tenant_key"`
	OwnerEmail        *string `json:"owner_email"`
	OrganizationName  *string `json:"organization_name"`
	UsersCount        int64   `json:"users_count"`
	ProjectsCount     int64   `json:"projects_count"`
	SessionsCount     int64   `json:"sessions_count"`
	IntegrationsCount int64   `json:"integrations_count"`
}

// toStat mirrors process_data: with opt_out the owner e-mail and organization name are
// withheld, the counters are always sent.
func toStat(t TenantStats) Stat {
	s := Stat{
		Edition:           edition,
		Tracking:          t.OptOut,
		Version:           t.Version,
		UserID:            t.TenantKey,
		TenantKey:         t.TenantKey,
		UsersCount:        t.Users,
		ProjectsCount:     t.Projects,
		SessionsCount:     t.Sessions,
		IntegrationsCount: t.Integrations,
	}
	if !t.OptOut {
		s.OwnerEmail = t.OwnerEmail
		name := t.Name
		s.OrganizationName = &name
	}
	return s
}
