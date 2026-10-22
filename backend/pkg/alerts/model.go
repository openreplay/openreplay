package alerts

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"regexp"
	"strconv"
	"strings"

	"openreplay/backend/pkg/analytics/model"
)

const (
	DetectionThreshold = "threshold"
	DetectionChange    = "change"

	ChangeTypeChange  = "change"
	ChangeTypePercent = "percent"

	LeftCustom = "CUSTOM"

	MessageSlack   = "slack"
	MessageMSTeams = "msteams"
	MessageEmail   = "email"
	MessageWebhook = "webhook"
)

type AlertColumn string

const (
	ColumnDomContentLoaded   AlertColumn = "performance.dom_content_loaded.average"
	ColumnFirstMeaningfulPnt AlertColumn = "performance.first_meaningful_paint.average"
	ColumnPageLoadTime       AlertColumn = "performance.page_load_time.average"
	ColumnDomBuildTime       AlertColumn = "performance.dom_build_time.average"
	ColumnSpeedIndex         AlertColumn = "performance.speed_index.average"
	ColumnPageResponseTime   AlertColumn = "performance.page_response_time.average"
	ColumnTTFB               AlertColumn = "performance.ttfb.average"
	ColumnTimeToRender       AlertColumn = "performance.time_to_render.average"
	ColumnCrashes            AlertColumn = "performance.crashes.count"
	ColumnJSErrors           AlertColumn = "errors.javascript.count"
	ColumnBackendErrors      AlertColumn = "errors.backend.count"
	ColumnCustom             AlertColumn = "CUSTOM"
)

var PredefinedColumns = []AlertColumn{
	ColumnDomContentLoaded,
	ColumnFirstMeaningfulPnt,
	ColumnPageLoadTime,
	ColumnDomBuildTime,
	ColumnSpeedIndex,
	ColumnPageResponseTime,
	ColumnTTFB,
	ColumnTimeToRender,
	ColumnCrashes,
	ColumnJSErrors,
	ColumnBackendErrors,
}

func isAlertColumn(s string) bool {
	if AlertColumn(s) == ColumnCustom {
		return true
	}
	for _, c := range PredefinedColumns {
		if string(c) == s {
			return true
		}
	}
	return false
}

var (
	namePattern      = regexp.MustCompile(`^[a-zA-Z0-9\-éèàç |&/\\_.#':,@]*$`)
	validPeriods     = map[int]bool{15: true, 30: true, 60: true, 120: true, 240: true, 1440: true}
	validOperators   = map[string]bool{"=": true, "<": true, ">": true, "<=": true, ">=": true}
	validDetections  = map[string]bool{"threshold": true, "change": true}
	validChangeTypes = map[string]bool{"percent": true, "change": true}
)

type MessageValue string

func (v *MessageValue) UnmarshalJSON(data []byte) error {
	data = bytes.TrimSpace(data)
	if len(data) > 0 && data[0] == '"' {
		var s string
		if err := json.Unmarshal(data, &s); err != nil {
			return err
		}
		*v = MessageValue(s)
		return nil
	}
	var n int64
	if err := json.Unmarshal(data, &n); err != nil {
		return fmt.Errorf("message value must be a string or an integer")
	}
	*v = MessageValue(strconv.FormatInt(n, 10))
	return nil
}

type Message struct {
	Type  string        `json:"type"`
	Value *MessageValue `json:"value"`
}

type Options struct {
	Message          []Message `json:"message"`
	CurrentPeriod    int       `json:"currentPeriod"`
	PreviousPeriod   int       `json:"previousPeriod"`
	LastNotification *int64    `json:"lastNotification"`
	RenotifyInterval *int      `json:"renotifyInterval"`
}

func (o *Options) UnmarshalJSON(data []byte) error {
	var raw map[string]json.RawMessage
	if err := json.Unmarshal(data, &raw); err != nil {
		return err
	}
	for _, key := range []string{"message", "previousPeriod"} {
		if v, ok := raw[key]; ok && string(v) == "null" {
			return fmt.Errorf("options.%s must not be null", key)
		}
	}
	type plain Options
	renotify := 720
	p := plain{Message: []Message{}, PreviousPeriod: 15, RenotifyInterval: &renotify}
	if err := json.Unmarshal(data, &p); err != nil {
		return err
	}
	*o = Options(p)
	return nil
}

type QueryLeft struct {
	Column   AlertColumn
	SeriesID *int
}

func (l *QueryLeft) UnmarshalJSON(data []byte) error {
	data = bytes.TrimSpace(data)
	if len(data) > 0 && data[0] == '"' {
		var s string
		if err := json.Unmarshal(data, &s); err != nil {
			return err
		}
		if id, err := strconv.ParseInt(s, 10, 32); err == nil {
			seriesID := int(id)
			l.SeriesID = &seriesID
			return nil
		}
		if (!isAlertColumn(s) && !isPropertyLeft(s)) || AlertColumn(s) == ColumnCustom {
			return fmt.Errorf("invalid query.left: %s", s)
		}
		l.Column = AlertColumn(s)
		return nil
	}
	var id int32
	if err := json.Unmarshal(data, &id); err != nil {
		return fmt.Errorf("query.left must be an alert column or a series id")
	}
	seriesID := int(id)
	l.SeriesID = &seriesID
	return nil
}

// IsProperty reports whether the left operand is a "properties.<key>" / "$properties.<key>" path.
func (l *QueryLeft) IsProperty() bool {
	return l != nil && l.SeriesID == nil && isPropertyLeft(string(l.Column))
}

type FlexFloat float64

func (f *FlexFloat) UnmarshalJSON(data []byte) error {
	data = bytes.TrimSpace(data)
	if len(data) > 0 && data[0] == '"' {
		var s string
		if err := json.Unmarshal(data, &s); err != nil {
			return err
		}
		v, err := strconv.ParseFloat(strings.TrimSpace(s), 64)
		if err != nil || math.IsNaN(v) || math.IsInf(v, 0) {
			return fmt.Errorf("query.right must be a number")
		}
		*f = FlexFloat(v)
		return nil
	}
	var v float64
	if err := json.Unmarshal(data, &v); err != nil {
		return fmt.Errorf("query.right must be a number")
	}
	*f = FlexFloat(v)
	return nil
}

type Query struct {
	Left     *QueryLeft `json:"left"`
	Right    *FlexFloat `json:"right"`
	Operator string     `json:"operator"`
	// Source is the table a property trigger reads (sessions | events | users). Required
	// when Left is a property path, ignored otherwise.
	Source *string `json:"source"`
}

type AlertRequest struct {
	Name            *string  `json:"name"`
	DetectionMethod string   `json:"detectionMethod"`
	Change          *string  `json:"change"`
	Description     *string  `json:"description"`
	Options         *Options `json:"options"`
	Query           *Query   `json:"query"`
}

func (r *AlertRequest) Validate() error {
	if r.Name == nil {
		return errors.New("name is required")
	}
	if !namePattern.MatchString(*r.Name) {
		return errors.New("name contains invalid characters")
	}
	if !validDetections[r.DetectionMethod] {
		return fmt.Errorf("invalid detectionMethod: %q", r.DetectionMethod)
	}
	if r.Change != nil && !validChangeTypes[*r.Change] {
		return fmt.Errorf("invalid change: %q", *r.Change)
	}
	if r.Options == nil {
		return errors.New("options is required")
	}
	if !validPeriods[r.Options.CurrentPeriod] {
		return fmt.Errorf("invalid options.currentPeriod: %d", r.Options.CurrentPeriod)
	}
	if !validPeriods[r.Options.PreviousPeriod] {
		return fmt.Errorf("invalid options.previousPeriod: %d", r.Options.PreviousPeriod)
	}
	for i, m := range r.Options.Message {
		if m.Type == "" {
			return fmt.Errorf("options.message[%d].type is required", i)
		}
		if m.Value == nil {
			return fmt.Errorf("options.message[%d].value is required", i)
		}
	}
	if r.Query == nil {
		return errors.New("query is required")
	}
	if r.Query.Left == nil {
		return errors.New("query.left is required")
	}
	if r.Query.Right == nil {
		return errors.New("query.right is required")
	}
	if !validOperators[r.Query.Operator] {
		return fmt.Errorf("invalid query.operator: %q", r.Query.Operator)
	}
	if r.Query.Left.IsProperty() {
		if r.Query.Source == nil {
			return errors.New("query.source is required when query.left is a property")
		}
		src := normalizeSource(*r.Query.Source)
		if _, ok := allowedSources[src]; !ok {
			return fmt.Errorf("invalid query.source: %q (must be one of sessions, events, users)", *r.Query.Source)
		}
		if _, err := (QueryToExecute{Left: string(r.Query.Left.Column)}).Property(); err != nil {
			return err
		}
	} else if r.Query.Source != nil {
		if _, ok := allowedSources[normalizeSource(*r.Query.Source)]; !ok {
			return fmt.Errorf("invalid query.source: %q (must be one of sessions, events, users)", *r.Query.Source)
		}
	}
	return nil
}

func (r *AlertRequest) ChangeType() string {
	if r.Change == nil {
		return "change"
	}
	return *r.Change
}

func (r *AlertRequest) SeriesID() *int {
	return r.Query.Left.SeriesID
}

type storedQuery struct {
	Left     AlertColumn `json:"left"`
	Right    float64     `json:"right"`
	Operator string      `json:"operator"`
	Source   string      `json:"source,omitempty"`
}

func (r *AlertRequest) QueryJSON() ([]byte, error) {
	left := r.Query.Left.Column
	if r.Query.Left.SeriesID != nil {
		left = ColumnCustom
	}
	q := storedQuery{Left: left, Right: float64(*r.Query.Right), Operator: r.Query.Operator}
	if r.Query.Left.IsProperty() && r.Query.Source != nil {
		q.Source = normalizeSource(*r.Query.Source)
	}
	return json.Marshal(q)
}

func (r *AlertRequest) OptionsJSON() ([]byte, error) {
	return json.Marshal(r.Options)
}

type Alert struct {
	AlertID         int             `json:"alertId"`
	ProjectID       int             `json:"projectId"`
	SeriesID        *int            `json:"seriesId"`
	Name            string          `json:"name"`
	Description     *string         `json:"description"`
	Active          bool            `json:"active"`
	DetectionMethod string          `json:"detectionMethod"`
	Change          string          `json:"change"`
	Query           map[string]any  `json:"query"`
	Options         json.RawMessage `json:"options"`
	CreatedAt       int64           `json:"createdAt"`
	SeriesName      *string         `json:"seriesName,omitempty"`
}

func (a *Alert) toFront() {
	if a.SeriesID != nil && a.Query != nil && a.Query["left"] == string(ColumnCustom) {
		a.Query["left"] = *a.SeriesID
		a.SeriesID = nil
	}
}

type Trigger struct {
	Name       string `json:"name"`
	Value      any    `json:"value"`
	Unit       string `json:"unit"`
	Predefined bool   `json:"predefined"`
	MetricID   *int   `json:"metricId"`
	SeriesID   *int   `json:"seriesId"`
	Source     string `json:"source"`
	// DataType is the lexicon value type of a property trigger (number, integer, string, ...).
	DataType string `json:"dataType,omitempty"`
}

func PredefinedTriggers() []Trigger {
	triggers := make([]Trigger, 0, len(PredefinedColumns))
	for _, c := range PredefinedColumns {
		unit := "ms"
		if strings.HasSuffix(string(c), ".count") {
			unit = "count"
		}
		triggers = append(triggers, Trigger{Name: string(c), Value: string(c), Unit: unit, Predefined: true, Source: "predefined"})
	}
	return triggers
}

// Operator is the comparison stored in alerts.query.operator. Only the listed values are
// accepted; the comparison is evaluated in Go, never interpolated into SQL.
type Operator string

const (
	OpEq  Operator = "="
	OpLt  Operator = "<"
	OpGt  Operator = ">"
	OpLte Operator = "<="
	OpGte Operator = ">="
)

var allowedOperators = map[Operator]struct{}{OpEq: {}, OpLt: {}, OpGt: {}, OpLte: {}, OpGte: {}}

func (o Operator) Valid() bool {
	_, ok := allowedOperators[o]
	return ok
}

// Compare applies the operator to (v, right).
func (o Operator) Compare(v, right float64) bool {
	switch o {
	case OpEq:
		return v == right
	case OpLt:
		return v < right
	case OpGt:
		return v > right
	case OpLte:
		return v <= right
	case OpGte:
		return v >= right
	}
	return false
}

// Number decodes from a JSON number or a numeric JSON string ("12", " 12.5 ").
type Number float64

func (n *Number) UnmarshalJSON(b []byte) error {
	s := strings.TrimSpace(string(b))
	if s == "null" {
		return fmt.Errorf("number is null")
	}
	if strings.HasPrefix(s, `"`) {
		var str string
		if err := json.Unmarshal(b, &str); err != nil {
			return err
		}
		f, err := strconv.ParseFloat(strings.TrimSpace(str), 64)
		if err != nil {
			return fmt.Errorf("invalid numeric string %q: %w", str, err)
		}
		*n = Number(f)
		return nil
	}
	var f float64
	if err := json.Unmarshal(b, &f); err != nil {
		return err
	}
	*n = Number(f)
	return nil
}

// Property sources: which ClickHouse table a "properties.<key>" / "$properties.<key>" alert reads.
const (
	SourceEvents   = "events"
	SourceSessions = "sessions"
	SourceUsers    = "users"
)

var allowedSources = map[string]struct{}{SourceEvents: {}, SourceSessions: {}, SourceUsers: {}}

func normalizeSource(s string) string { return strings.ToLower(strings.TrimSpace(s)) }

// isPropertyLeft reports whether left is a "properties.<key>" / "$properties.<key>" path.
func isPropertyLeft(left string) bool {
	return strings.HasPrefix(left, PropertiesColumn+".") || strings.HasPrefix(left, AutoPropertiesColumn+".")
}

const (
	PropertiesColumn     = "properties"
	AutoPropertiesColumn = "$properties"
)

// Query mirrors alerts.query:
//
//	{"left": string, "right": string|number, "operator": string, "source"?: string}
//
// left is either a predefined metric key, "CUSTOM" (series alert), or a property path
// "properties.<key>" / "$properties.<key>" read from the JSON column of the same name on the
// source table. source is sessions | events | users and defaults to events.
type QueryToExecute struct {
	Left     string   `json:"left"`
	Right    Number   `json:"right"`
	Operator Operator `json:"operator"`
	Source   string   `json:"source"`
}

// PropertyRef is a parsed "properties.<key>" / "$properties.<key>" left operand.
type PropertyRef struct {
	Column string // PropertiesColumn | AutoPropertiesColumn
	Key    string // JSON key inside the column, never empty
}

// IsProperty reports whether left addresses a JSON property rather than a predefined metric.
func (q QueryToExecute) IsProperty() bool { return isPropertyLeft(q.Left) }

// Property parses left into its column and key. It fails when the key is empty.
func (q QueryToExecute) Property() (PropertyRef, error) {
	col, key, ok := strings.Cut(q.Left, ".")
	if !ok || (col != PropertiesColumn && col != AutoPropertiesColumn) {
		return PropertyRef{}, fmt.Errorf("query.left %q is not a property path", q.Left)
	}
	if strings.TrimSpace(key) == "" {
		return PropertyRef{}, fmt.Errorf("query.left %q has an empty property key", q.Left)
	}
	return PropertyRef{Column: col, Key: key}, nil
}

// EffectiveSource returns the normalised source, defaulting to events when absent.
func (q QueryToExecute) EffectiveSource() string {
	src := normalizeSource(q.Source)
	if src == "" {
		return SourceEvents
	}
	return src
}

func (q QueryToExecute) Validate() error {
	if strings.TrimSpace(q.Left) == "" {
		return fmt.Errorf("query.left is empty")
	}
	if !q.Operator.Valid() {
		return fmt.Errorf("query.operator %q is not one of = < > <= >=", string(q.Operator))
	}
	if _, ok := allowedSources[q.EffectiveSource()]; !ok {
		return fmt.Errorf("query.source %q is not one of sessions, events, users", q.Source)
	}
	if q.IsProperty() {
		if _, err := q.Property(); err != nil {
			return err
		}
	}
	return nil
}

// Message is one notification target in alerts.options.message.
type MessageToExecute struct {
	Type  string       `json:"type"`  // slack | msteams | email | webhook
	Value MessageValue `json:"value"` // webhook id (slack/msteams/webhook) or e-mail address; stored as string or int
}

// Options mirrors alerts.options.
type OptionsToExecute struct {
	Message          []MessageToExecute `json:"message"`
	CurrentPeriod    int                `json:"currentPeriod"`  // minutes: 15,30,60,120,240,1440
	PreviousPeriod   int                `json:"previousPeriod"` // minutes
	LastNotification *int64             `json:"lastNotification,omitempty"`
	RenotifyInterval int                `json:"renotifyInterval"` // minutes
}

// Alert is one row of the active-alerts query (see storage.go).
type AlertToExecute struct {
	AlertID         int64              `db:"alert_id"`
	TenantID        int64              `db:"tenant_id"` // -1 on CE
	ProjectID       int64              `db:"project_id"`
	ProjectName     string             `db:"project_name"`
	Name            string             `db:"name"`
	DetectionMethod string             `db:"detection_method"`
	Change          string             `db:"change"`
	SeriesID        *int64             `db:"series_id"`
	SeriesName      string             `db:"series_name"`
	CreatedAt       int64              `db:"created_at"` // epoch ms
	Query           QueryToExecute     `db:"query"`
	Options         OptionsToExecute   `db:"options"`
	Filter          *model.FilterGroup `db:"filter"` // metric_series.filter, nil without a series
}

// IsSeries reports whether the alert is evaluated through a saved metric series.
func (a *AlertToExecute) IsSeries() bool {
	return a.Query.Left == LeftCustom
}

// Result is the outcome of evaluating one alert.
type Result struct {
	Value float64
	Valid bool
}

// Notification is the port of generate_notification's output.
type Notification struct {
	AlertID     int64
	TenantID    int64
	ProjectID   int64
	ProjectName string
	Title       string
	Description string
	ButtonText  string
	ButtonURL   string
	Messages    []MessageToExecute
	// StoredOptions is persisted in public.notifications.options.
	StoredOptions map[string]any
	// WebhookData is the body posted to generic webhooks.
	WebhookData map[string]any
}

// Webhook is one row of public.webhooks used as a Slack/MS Teams/generic destination.
type Webhook struct {
	WebhookID  int64   `db:"webhook_id"`
	Endpoint   string  `db:"endpoint"`
	AuthHeader *string `db:"auth_header"`
	Type       string  `db:"type"`
}
