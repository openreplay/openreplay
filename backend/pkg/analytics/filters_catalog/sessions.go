package filters_catalog

import "openreplay/backend/pkg/analytics/filters_catalog/model"

// GetSessionsFilters mirrors api/chalicelib/core/product_analytics/filters.py:get_sessions_filters.
// The Total field is intentionally 13 (Python's hard-coded literal) even though the list has 17
// items — the frontend uses len(List), not Total. Order matches the Python source.
func GetSessionsFilters() model.FilterSection {
	str := []string{"string"}

	// Country values: convert []string to []any.
	countryValues := make([]any, 0, len(CountryCodes))
	for _, c := range CountryCodes {
		countryValues = append(countryValues, c)
	}

	// Issue values: golden shape is {id, name, autoCaptured} — only 3 of IssueType's 5 fields.
	issueValues := make([]any, 0, len(IssueTypes))
	for _, it := range IssueTypes {
		issueValues = append(issueValues, map[string]any{
			"id":           it.Type,
			"name":         it.Name,
			"autoCaptured": it.AutoCaptured,
		})
	}

	deviceTypeValues := []any{"desktop", "mobile", "tablet"}

	// mkEnum builds a StaticFilterItem for a named filter type.
	// prefix is the ID namespace (e.g. "sf"); the helper appends "_" before def.EnumStr.
	mkEnum := func(prefix string, def FilterTypeDef, display, dataType string, types []string, predefined, conditional bool, values []any) model.StaticFilterItem {
		if values == nil {
			values = []any{}
		}
		return model.StaticFilterItem{
			ID:             StringToID(prefix + "_" + def.EnumStr),
			Name:           def.Name,
			DisplayName:    display,
			PossibleTypes:  types,
			DataType:       dataType,
			AutoCaptured:   true,
			IsPredefined:   predefined,
			PossibleValues: values,
			IsConditional:  conditional,
		}
	}

	// mkLiteral builds a StaticFilterItem for filters without a FilterTypeDef enum
	// (screenHeight, screenWidth). idInput is the full string passed to StringToID.
	mkLiteral := func(idInput, name, display, dataType string, types []string, conditional bool) model.StaticFilterItem {
		return model.StaticFilterItem{
			ID:             StringToID(idInput),
			Name:           name,
			DisplayName:    display,
			PossibleTypes:  types,
			DataType:       dataType,
			AutoCaptured:   true,
			IsPredefined:   false,
			PossibleValues: []any{},
			IsConditional:  conditional,
		}
	}

	list := []any{
		mkEnum("sf", FTReferrer, "Referrer", "string", str, false, false, nil),
		mkEnum("sf", FTDuration, "Duration", "int", []string{"int"}, false, true, nil),
		mkEnum("sf", FTUTMSource, "UTM Source", "string", str, false, false, nil),
		mkEnum("sf", FTUTMMedium, "UTM Medium", "string", str, false, false, nil),
		mkEnum("sf", FTUTMCampaign, "UTM Campaign", "string", str, false, false, nil),
		mkEnum("sf", FTUserCountry, "Country", "string", str, true, true, countryValues),
		mkEnum("sf", FTUserCity, "City", "string", str, false, false, nil),
		mkEnum("sf", FTUserState, "State / Province", "string", str, false, false, nil),
		mkEnum("sf", FTUserOS, "OS", "string", str, false, true, nil),
		mkEnum("sf", FTUserBrowser, "Browser", "string", str, false, true, nil),
		mkEnum("sf", FTUserBrowserVersion, "Browser Version", "string", str, false, true, nil),
		mkEnum("sf", FTUserDevice, "Device", "string", str, false, true, nil),
		mkEnum("sf", FTUserDeviceType, "Device Type", "string", str, true, false, deviceTypeValues),
		mkEnum("sf", FTRevID, "Version ID", "string", str, false, false, nil),
		mkEnum("sf", FTIssue, "Issue", "string", str, true, false, issueValues),
		mkLiteral("sf_screenHeight", "screenHeight", "Screen Height", "UInt16", []string{"UInt16"}, false),
		mkLiteral("sf_screenWidth", "screenWidth", "Screen Width", "UInt16", []string{"UInt16"}, false),
	}

	return model.FilterSection{
		Total:       13,
		DisplayName: "Session Filters",
		Scope:       []string{"sessions"},
		List:        list,
	}
}

// GetUsersFilters mirrors the Python get_users_filters() output.
func GetUsersFilters() model.FilterSection {
	str := []string{"string"}

	mkEnum := func(prefix string, def FilterTypeDef, display, dataType string, types []string, predefined, conditional bool, values []any) model.StaticFilterItem {
		if values == nil {
			values = []any{}
		}
		return model.StaticFilterItem{
			ID:             StringToID(prefix + "_" + def.EnumStr),
			Name:           def.Name,
			DisplayName:    display,
			PossibleTypes:  types,
			DataType:       dataType,
			AutoCaptured:   true,
			IsPredefined:   predefined,
			PossibleValues: values,
			IsConditional:  conditional,
		}
	}

	list := []any{
		mkEnum("uf", FTUserID, "User ID", "string", str, false, true, nil),
	}
	return model.FilterSection{
		Total:       2,
		DisplayName: "User Filters",
		Scope:       []string{"sessions"},
		List:        list,
	}
}

// GetUsersIdentifiedFilters mirrors the Python get_identified_users_filters() output.
// IDs are computed via StringToID("uif_" + name) — not via FilterTypeDef enum strings.
func GetUsersIdentifiedFilters() model.FilterSection {
	type cfg struct {
		name, display, dataType string
		predefined              bool
		values                  []any
	}

	countryValues := make([]any, 0, len(CountryCodes))
	for _, c := range CountryCodes {
		countryValues = append(countryValues, c)
	}

	rows := []cfg{
		{"$user_id", "User ID", "string", false, nil},
		{"$email", "Email", "string", false, nil},
		{"$name", "Name", "string", false, nil},
		{"$first_name", "First Name", "string", false, nil},
		{"$last_name", "Last Name", "string", false, nil},
		{"$phone", "Phone", "string", false, nil},
		{"$sdk_edition", "SDK Edition", "string", false, nil},
		{"$sdk_version", "SDK Version", "string", false, nil},
		{"$current_url", "Current URL", "string", false, nil},
		{"$current_path", "Current Path", "string", false, nil},
		{"$initial_referrer", "Initial Referrer", "string", false, nil},
		{"$referring_domain", "Referring Domain", "string", false, nil},
		{"initial_utm_source", "Initial UTM Source", "string", false, nil},
		{"initial_utm_medium", "Initial UTM Medium", "string", false, nil},
		{"initial_utm_campaign", "Initial UTM Campaign", "string", false, nil},
		{"$country", "Country", "string", true, countryValues},
		{"$state", "State", "string", false, nil},
		{"$city", "City", "string", false, nil},
		{"$or_api_endpoint", "OR API Endpoint", "string", false, nil},
		{"$created_at", "Created At", "timestamp", false, nil},
		{"$first_event_at", "First Event At", "timestamp", false, nil},
		{"$last_seen", "Last Seen", "timestamp", false, nil},
	}

	list := make([]any, 0, len(rows))
	for _, r := range rows {
		values := r.values
		if values == nil {
			values = []any{}
		}
		list = append(list, model.StaticFilterItem{
			ID:             StringToID("uif_" + r.name),
			Name:           r.name,
			DisplayName:    r.display,
			PossibleTypes:  []string{r.dataType},
			DataType:       r.dataType,
			AutoCaptured:   true,
			IsPredefined:   r.predefined,
			PossibleValues: values,
			IsConditional:  false,
		})
	}

	return model.FilterSection{
		Total:       len(list),
		DisplayName: "Identified User Filters",
		Scope:       []string{"events", "users"},
		List:        list,
	}
}
