package geoip

import (
	"log"
	"net"

	maxminddb "github.com/oschwald/maxminddb-golang"
)

type geoIPRecord struct {
	Country struct {
		ISOCode string `maxminddb:"iso_code"`
	} `maxminddb:"country"`
}

type GeoIP struct {
	r *maxminddb.Reader
}

func NewGeoIP(file string) *GeoIP {
	r, err := maxminddb.Open(file)
	if err != nil {
		log.Fatalln(err)
	}
	return &GeoIP{r}
}

func (geoIP *GeoIP) ExtractISOCode(ip net.IP) string {
	if ip == nil {
		return "UN"
	}
	var code string
	var record geoIPRecord
	if geoIP.r.Lookup(ip, &record) == nil {
		code = record.Country.ISOCode
	}
	if code == "" {
		code = "UN"
	}
	return code
}
