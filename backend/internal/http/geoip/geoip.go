package geoip

import (
	"github.com/oschwald/maxminddb-golang"
	"log"
	"net"
	"strings"
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
	Parse(ip net.IP) *GeoRecord
}

type geoParser struct {
	r *maxminddb.Reader
}

func New(file string) GeoParser {
	r, err := maxminddb.Open(file)
	if err != nil {
		log.Fatalln(err)
	}
	return &geoParser{r}
}

func (geoIP *geoParser) Parse(ip net.IP) *GeoRecord {
	res := &GeoRecord{
		Country: "UN",
		State:   "",
		City:    "",
	}
	if ip == nil {
		return res
	}
	var record geoIPRecord
	if err := geoIP.r.Lookup(ip, &record); err != nil {
		log.Println(err)
		return res
	}
	if record.Country.ISOCode != "" {
		res.Country = record.Country.ISOCode
	}
	if len(record.States) > 0 {
		res.State = record.States[0].Names["en"]
	}
	res.City = record.City.Names["en"]
	return res
}
