package license

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"sync"
	"time"

	"openreplay/backend/pkg/env"
)

const (
	licenseServerURL       = "https://api.openreplay.com/license/validate"
	licenseServerTimeout   = 10 * time.Second
	recheckInterval        = 24 * time.Hour
	maxConsecutiveFailures = 3
)

type request struct {
	MID     string `json:"mid"`
	License string `json:"license"`
}

type response struct {
	Data struct {
		IsValid             bool  `json:"valid"`
		ExpirationTimestamp int64 `json:"expiration"`
	} `json:"data"`
}

var periodicOnce sync.Once

var errRejected = errors.New("license server rejected the license")

func CheckLicense() {
	license := env.String("LICENSE_KEY")
	lic, err := validate(license, time.Now())
	if err != nil {
		log.Fatalf("License is not valid: %v", err)
	}
	warnIfExpiring(lic, time.Now())

	periodicOnce.Do(func() {
		c := &checker{
			validate: func() (*License, error) { return validate(license, time.Now()) },
			fatal:    log.Fatalf,
		}
		go func() {
			for range time.Tick(recheckInterval) {
				c.tick()
			}
		}()
	})
}

func validate(license string, now time.Time) (*License, error) {
	if IsToken(license) {
		return Verify(license, now, publicKeys)
	}
	_, err := validateRemote(license)
	return nil, err
}

func validateRemote(license string) (int64, error) {
	requestBody, err := json.Marshal(request{License: license})
	if err != nil {
		return 0, fmt.Errorf("can not form a license check request: %v", err)
	}
	client := &http.Client{Timeout: licenseServerTimeout}
	resp, err := client.Post(licenseServerURL, "application/json", bytes.NewReader(requestBody))
	if err != nil {
		return 0, fmt.Errorf("error while checking license: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 && resp.StatusCode < 500 &&
		resp.StatusCode != http.StatusRequestTimeout && resp.StatusCode != http.StatusTooManyRequests {
		return 0, fmt.Errorf("license check request returned status %d: %w", resp.StatusCode, errRejected)
	}
	if resp.StatusCode != 200 {
		return 0, fmt.Errorf("license check request returned status %d", resp.StatusCode)
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return 0, fmt.Errorf("error while reading license check response: %v", err)
	}
	respJson := new(response)
	if err = json.Unmarshal(body, respJson); err != nil {
		return 0, fmt.Errorf("error while parsing license check response: %v", err)
	}
	if !respJson.Data.IsValid {
		return 0, errRejected
	}
	return respJson.Data.ExpirationTimestamp, nil
}

func warnIfExpiring(lic *License, now time.Time) {
	if lic == nil {
		return
	}
	daysLeft := lic.DaysLeft(now)
	switch {
	case daysLeft < 0:
		log.Printf("WARNING: license for %s expired %d day(s) ago, grace period ends on %s, please renew",
			lic.Customer, -daysLeft, lic.HardExpiresAt().Format("2006-01-02"))
	case daysLeft <= WarnBeforeDays:
		log.Printf("WARNING: license for %s expires in %d day(s), please renew", lic.Customer, daysLeft)
	}
}

// checker re-validates the license and counts failures.
type checker struct {
	validate func() (*License, error)
	fatal    func(format string, args ...any)
	failures int
}

func (c *checker) tick() {
	lic, err := c.validate()
	if err != nil {
		c.failures++
		if c.failures >= maxConsecutiveFailures {
			c.fatal("License check failed %d times in a row, exiting: %v", c.failures, err)
			return
		}
		log.Printf("WARNING: license check failed (%d/%d): %v", c.failures, maxConsecutiveFailures, err)
		return
	}
	c.failures = 0
	warnIfExpiring(lic, time.Now())
}
