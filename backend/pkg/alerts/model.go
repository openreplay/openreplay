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
		if !isAlertColumn(s) || AlertColumn(s) == ColumnCustom {
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
}

func (r *AlertRequest) QueryJSON() ([]byte, error) {
	left := r.Query.Left.Column
	if r.Query.Left.SeriesID != nil {
		left = ColumnCustom
	}
	return json.Marshal(storedQuery{Left: left, Right: float64(*r.Query.Right), Operator: r.Query.Operator})
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
}

func PredefinedTriggers() []Trigger {
	triggers := make([]Trigger, 0, len(PredefinedColumns))
	for _, c := range PredefinedColumns {
		unit := "ms"
		if strings.HasSuffix(string(c), ".count") {
			unit = "count"
		}
		triggers = append(triggers, Trigger{Name: string(c), Value: string(c), Unit: unit, Predefined: true})
	}
	return triggers
}
