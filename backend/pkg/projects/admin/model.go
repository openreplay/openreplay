package admin

import (
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"unicode/utf8"
)

const (
	maxProjectNameLength = 200
	maxMetadataKeyLength = 100
	maxMetadataKeys      = 10
	defaultPlatform      = "web"
)

var (
	ErrProjectNotFound  = errors.New("project not found")
	ErrNameExists       = errors.New("name already exists.")
	ErrMetadataLimit    = errors.New("maximum allowed metadata reached")
	ErrMetadataNotFound = errors.New("custom field not found")
)

var (
	projectNamePattern = regexp.MustCompile(`^[a-zA-Z0-9\-éèàç |&/\\_.#':,@]*$`)
	validPlatforms     = map[string]bool{"web": true, "ios": true}
	validInputModes    = map[string]bool{"plain": true, "obscured": true, "hidden": true}
)

func normalizeSpaces(s string) string {
	return strings.Join(strings.Fields(s), " ")
}

type ProjectRequest struct {
	Name     string `json:"name"`
	Platform string `json:"platform"`
}

func (r *ProjectRequest) Normalize(create bool) error {
	r.Name = normalizeSpaces(r.Name)
	if r.Name == "" {
		return errors.New("name is required")
	}
	if utf8.RuneCountInString(r.Name) > maxProjectNameLength {
		return fmt.Errorf("name must be at most %d characters", maxProjectNameLength)
	}
	if !projectNamePattern.MatchString(r.Name) {
		return errors.New("name contains invalid characters")
	}
	if r.Platform == "" && create {
		r.Platform = defaultPlatform
	}
	if r.Platform != "" && !validPlatforms[r.Platform] {
		return errors.New("platform must be one of: web, ios")
	}
	return nil
}

type ProjectListItem struct {
	ProjectID           uint32          `json:"projectId"`
	Name                string          `json:"name"`
	ProjectKey          string          `json:"projectKey"`
	SaveRequestPayloads bool            `json:"saveRequestPayloads"`
	CreatedAt           int64           `json:"createdAt"`
	SampleRate          int             `json:"sampleRate"`
	Platform            string          `json:"platform"`
	ConditionsCount     int             `json:"conditionsCount"`
	GDPR                json.RawMessage `json:"gdpr"`
	Recorded            bool            `json:"recorded"`
}

type ProjectInfo struct {
	ProjectID           uint32          `json:"projectId"`
	ProjectKey          string          `json:"projectKey"`
	Name                string          `json:"name"`
	SaveRequestPayloads bool            `json:"saveRequestPayloads"`
	Platform            string          `json:"platform"`
	GDPR                json.RawMessage `json:"gdpr"`
}

type ProjectDetails struct {
	ProjectInfo
	LastRecordedSessionAt *int64 `json:"lastRecordedSessionAt"`
}

type ProjectUpdated struct {
	ProjectID uint32          `json:"projectId"`
	Name      string          `json:"name"`
	GDPR      json.RawMessage `json:"gdpr"`
}

type CaptureRate struct {
	Rate       int  `json:"rate"`
	CaptureAll bool `json:"captureAll"`
}

type CaptureRateRequest struct {
	Rate       *int `json:"rate"`
	CaptureAll bool `json:"captureAll"`
}

func (r *CaptureRateRequest) Validate() error {
	if r.Rate == nil {
		return errors.New("rate is required")
	}
	if *r.Rate < 0 || *r.Rate > 100 {
		return errors.New("rate must be between 0 and 100")
	}
	return nil
}

func (r *CaptureRateRequest) SampleRate() int {
	if r.CaptureAll {
		return 100
	}
	return *r.Rate
}

type GDPRRequest struct {
	MaskEmails       *bool   `json:"maskEmails"`
	SampleRate       *int    `json:"sampleRate"`
	MaskNumbers      *bool   `json:"maskNumbers"`
	DefaultInputMode *string `json:"defaultInputMode"`
}

func (r *GDPRRequest) Validate() error {
	switch {
	case r.MaskEmails == nil:
		return errors.New("maskEmails is required")
	case r.SampleRate == nil:
		return errors.New("sampleRate is required")
	case r.MaskNumbers == nil:
		return errors.New("maskNumbers is required")
	case r.DefaultInputMode == nil:
		return errors.New("defaultInputMode is required")
	}
	if *r.SampleRate < 0 || *r.SampleRate > 100 {
		return errors.New("sampleRate must be between 0 and 100")
	}
	if !validInputModes[*r.DefaultInputMode] {
		return errors.New("defaultInputMode must be one of: plain, obscured, hidden")
	}
	return nil
}

type MetadataKey struct {
	Key   string `json:"key"`
	Index int    `json:"index"`
}

type MetadataRequest struct {
	Key string `json:"key"`
}

func (r *MetadataRequest) Normalize() error {
	r.Key = normalizeSpaces(r.Key)
	if r.Key == "" {
		return errors.New("key value invalid")
	}
	if utf8.RuneCountInString(r.Key) > maxMetadataKeyLength {
		return fmt.Errorf("key must be at most %d characters", maxMetadataKeyLength)
	}
	return nil
}

func ValidMetadataIndex(index int) bool {
	return index >= 1 && index <= maxMetadataKeys
}

type Limits struct {
	TeamMember int `json:"teamMember"`
	Projects   int `json:"projects"`
}
