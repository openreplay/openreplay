package geoip

import (
	"net"
	"net/http"

	"github.com/tomasen/realip"
)

func (geoIP *GeoIP) ExtractISOCodeFromHTTPRequest(r *http.Request) string {
	ip := net.ParseIP(realip.FromRequest(r))
	return geoIP.ExtractISOCode(ip)
}
