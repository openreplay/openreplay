package accounts

import (
	"errors"
	"fmt"
	"regexp"
	"slices"
	"strings"
	"unicode/utf8"
)

const (
	maxNameLength   = 100
	apiKeyLength    = 20
	apiKeyAlphabet  = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
	scopeSpotOnly   = 1
	scopeFull       = 2
	settingsModules = "modules"
)

var (
	ErrUserNotFound   = errors.New("current user not found")
	ErrTenantNotFound = errors.New("current tenant not found")
)

var (
	accountNamePattern = regexp.MustCompile(`^[\p{L}\p{M}\p{N}_\s\-'.&@]+$`)
	moduleTypes        = []string{"assist", "notes", "bug-reports", "offline-recordings", "alerts", "assist-stats",
		"recommendations", "feature-flags", "usability-tests"}
)

func normalizeSpaces(s string) string {
	return strings.Join(strings.Fields(s), " ")
}

func validateAccountName(field, value string) error {
	if utf8.RuneCountInString(value) > maxNameLength {
		return fmt.Errorf("%s must be at most %d characters", field, maxNameLength)
	}
	if !accountNamePattern.MatchString(value) {
		return fmt.Errorf("%s contains invalid characters. Only letters, numbers, spaces, hyphens, apostrophes, and periods are allowed", field)
	}
	return nil
}

type userInfo struct {
	UserID      uint64         `json:"userId"`
	Email       string         `json:"email"`
	Role        string         `json:"role"`
	Name        string         `json:"name"`
	SuperAdmin  bool           `json:"superAdmin"`
	Admin       bool           `json:"admin"`
	Member      bool           `json:"member"`
	HasPassword bool           `json:"hasPassword"`
	Settings    map[string]any `json:"settings"`
}

func (u *userInfo) setRole(role string) {
	u.Role = role
	u.SuperAdmin = role == "owner"
	u.Admin = role == "admin"
	u.Member = role == "member"
}

func normalizeSettings(settings map[string]any) map[string]any {
	if settings == nil {
		settings = map[string]any{}
	}
	if modules, ok := settings[settingsModules].([]any); !ok || len(modules) == 0 {
		settings[settingsModules] = []any{}
	}
	return settings
}

type tenantInfo struct {
	TenantID      uint64  `json:"tenantId"`
	TenantName    string  `json:"tenantName"`
	APIKey        *string `json:"apiKey,omitempty"`
	TenantKey     *string `json:"tenantKey,omitempty"`
	CreatedAt     int64   `json:"createdAt"`
	Edition       string  `json:"edition"`
	VersionNumber string  `json:"versionNumber"`
	OptOut        bool    `json:"optOut"`
	ScopeState    int     `json:"scopeState"`
}

type Account struct {
	userInfo
	userExtra
	tenantInfo
	HasActivePlan  bool  `json:"hasActivePlan"`
	ExpirationDate int64 `json:"expirationDate"`
	SMTP           bool  `json:"smtp"`
	accountExtra
}

type AccountRequest struct {
	Name       *string `json:"name"`
	TenantName *string `json:"tenantName"`
	OptOut     *bool   `json:"optOut"`
}

func (r *AccountRequest) Normalize() error {
	if r.Name != nil {
		name := normalizeSpaces(*r.Name)
		r.Name = &name
		if name != "" {
			if err := validateAccountName("name", name); err != nil {
				return err
			}
		}
	}
	if r.TenantName != nil {
		tenantName := normalizeSpaces(*r.TenantName)
		r.TenantName = &tenantName
		if tenantName != "" {
			if err := validateAccountName("tenantName", tenantName); err != nil {
				return err
			}
		}
	}
	return nil
}

type AccountInfo struct {
	Name       string `json:"name"`
	TenantName string `json:"tenantName"`
	OptOut     bool   `json:"optOut"`
}

type ScopeRequest struct {
	Scope *int `json:"scope"`
}

func (r *ScopeRequest) Value() (int, error) {
	if r.Scope == nil {
		return scopeSpotOnly, nil
	}
	if *r.Scope != scopeSpotOnly && *r.Scope != scopeFull {
		return 0, errors.New("scope must be 1 or 2")
	}
	return *r.Scope, nil
}

type APIKey struct {
	APIKey string `json:"apiKey"`
}

type WeeklyReport struct {
	WeeklyReport bool `json:"weeklyReport"`
}

type WeeklyReportRequest struct {
	WeeklyReport *bool `json:"weeklyReport"`
}

func (r *WeeklyReportRequest) Value() bool {
	return r.WeeklyReport == nil || *r.WeeklyReport
}

type ModuleRequest struct {
	Module string `json:"module"`
	Status *bool  `json:"status"`
}

func (r *ModuleRequest) Validate() error {
	if !slices.Contains(moduleTypes, r.Module) {
		return fmt.Errorf("module must be one of: %s", strings.Join(moduleTypes, ", "))
	}
	if r.Status == nil {
		return errors.New("status is required")
	}
	return nil
}

type UserSettings struct {
	Settings map[string]any `json:"settings"`
}

func applyModule(settings map[string]any, module string, status bool) map[string]any {
	settings = normalizeSettings(settings)
	modules := settings[settingsModules].([]any)
	idx := slices.IndexFunc(modules, func(m any) bool { return m == module })
	switch {
	case status && idx < 0:
		modules = append(modules, module)
	case !status && idx >= 0:
		modules = slices.Delete(modules, idx, idx+1)
	}
	settings[settingsModules] = modules
	return settings
}
