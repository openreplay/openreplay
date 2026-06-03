package filters_catalog

var EventsSimpleProperties = map[string]struct{}{
	"$user_id":          {},
	"$sdk_edition":      {},
	"$sdk_version":      {},
	"$current_url":      {},
	"$current_path":     {},
	"$initial_referrer": {},
	"$referring_domain": {},
	"$country":          {},
	"$state":            {},
	"$city":             {},
	"$or_api_endpoint":  {},
}

var UsersSimpleProperties = map[string]struct{}{
	"$user_id":             {},
	"$email":               {},
	"$name":                {},
	"$first_name":          {},
	"$last_name":           {},
	"$phone":               {},
	"$sdk_edition":         {},
	"$sdk_version":         {},
	"$current_url":         {},
	"$current_path":        {},
	"$initial_referrer":    {},
	"$referring_domain":    {},
	"initial_utm_source":   {},
	"initial_utm_medium":   {},
	"initial_utm_campaign": {},
	"$country":             {},
	"$state":               {},
	"$city":                {},
	"$or_api_endpoint":     {},
}
