package geoip

import (
	"errors"
	"github.com/tomasen/realip"
	"net"
	"net/http"
	"openreplay/backend/pkg/logger"
	"strings"

	"github.com/oschwald/maxminddb-golang"
)

type geoIPRecord struct {
	Country struct {
		ISOCode string `maxminddb:"iso_code"`
	} `maxminddb:"country"`
	States []struct {
		Names map[string]string `maxminddb:"names"`
	} `maxminddb:"subdivisions"`
	City struct {
		Names map[string]string `maxminddb:"names"`
	} `maxminddb:"city"`
}

type GeoRecord struct {
	Country string
	State   string
	City    string
}

func (r *GeoRecord) Pack() string {
	return r.Country + "|" + r.State + "|" + r.City
}

func UnpackGeoRecord(pkg string) *GeoRecord {
	parts := strings.Split(pkg, "|")
	if len(parts) != 3 {
		return &GeoRecord{
			Country: pkg,
		}
	}
	return &GeoRecord{
		Country: parts[0],
		State:   parts[1],
		City:    parts[2],
	}
}

type GeoParser interface {
	Parse(ip net.IP) (*GeoRecord, error)
	ExtractGeoData(r *http.Request) *GeoRecord
}

type geoParser struct {
	log logger.Logger
	r   *maxminddb.Reader
}

func New(log logger.Logger, file string) (GeoParser, error) {
	r, err := maxminddb.Open(file)
	if err != nil {
		return nil, err
	}
	return &geoParser{
		log: log,
		r:   r,
	}, nil
}

func (geoIP *geoParser) Parse(ip net.IP) (*GeoRecord, error) {
	res := &GeoRecord{
		Country: "UN",
		State:   "",
		City:    "",
	}
	if ip == nil {
		return res, errors.New("IP is nil")
	}
	var record geoIPRecord
	if err := geoIP.r.Lookup(ip, &record); err != nil {
		return res, err
	}
	if record.Country.ISOCode != "" {
		res.Country = record.Country.ISOCode
	}
	if len(record.States) > 0 {
		res.State = record.States[0].Names["en"]
	}
	res.City = record.City.Names["en"]
	return res, nil
}

func (geoIP *geoParser) ExtractGeoData(r *http.Request) *GeoRecord {
	ip := net.ParseIP(realip.FromRequest(r))
	geoRec, err := geoIP.Parse(ip)
	if err != nil {
		geoIP.log.Warn(r.Context(), "failed to parse geo data: %v", err)
	}
	return geoRec
}
