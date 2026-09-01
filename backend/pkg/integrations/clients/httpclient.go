package clients

import (
	"fmt"
	"net"
	"net/http"
	"net/url"
	"syscall"
	"time"
)

func isBlockedIP(ip net.IP) bool {
	if ip == nil {
		return true
	}
	if ip.IsLoopback() || ip.IsPrivate() || ip.IsUnspecified() ||
		ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() ||
		ip.IsInterfaceLocalMulticast() {
		return true
	}
	if ip.Equal(net.IPv4(169, 254, 169, 254)) {
		return true
	}
	if ip4 := ip.To4(); ip4 != nil && ip4[0] == 100 && ip4[1] >= 64 && ip4[1] <= 127 {
		return true
	}
	if ip.To4() == nil {
		if ip16 := ip.To16(); ip16 != nil && ip16[0] == 0xfe && ip16[1]&0xc0 == 0xc0 {
			return true
		}
	}
	if embedded := embeddedIPv4(ip); embedded != nil {
		return isBlockedIP(embedded)
	}
	return false
}

func embeddedIPv4(ip net.IP) net.IP {
	ip16 := ip.To16()
	if ip16 == nil || ip.To4() != nil {
		return nil
	}
	switch {
	case ip16[0] == 0x20 && ip16[1] == 0x02: // 6to4, 2002::/16
		return net.IPv4(ip16[2], ip16[3], ip16[4], ip16[5])
	case ip16[0] == 0x00 && ip16[1] == 0x64 && ip16[2] == 0xff && ip16[3] == 0x9b: // NAT64, 64:ff9b::/96
		if allZero(ip16[4:12]) {
			return net.IPv4(ip16[12], ip16[13], ip16[14], ip16[15])
		}
	case ip16[0] == 0x20 && ip16[1] == 0x01 && ip16[2] == 0x00 && ip16[3] == 0x00: // Teredo, 2001:0000::/32
		return net.IPv4(ip16[12]^0xff, ip16[13]^0xff, ip16[14]^0xff, ip16[15]^0xff)
	case allZero(ip16[0:12]): // IPv4-compatible, ::/96 (deprecated)
		return net.IPv4(ip16[12], ip16[13], ip16[14], ip16[15])
	}
	return nil
}

func allZero(b []byte) bool {
	for _, x := range b {
		if x != 0 {
			return false
		}
	}
	return true
}

func safeDialControl(network, address string, _ syscall.RawConn) error {
	host, _, err := net.SplitHostPort(address)
	if err != nil {
		return err
	}
	ip := net.ParseIP(host)
	if ip == nil {
		return fmt.Errorf("could not parse resolved address %q", address)
	}
	if isBlockedIP(ip) {
		return fmt.Errorf("refusing to connect to non-public address %s", ip)
	}
	return nil
}

var SafeTransport = &http.Transport{
	Proxy: http.ProxyFromEnvironment,
	DialContext: (&net.Dialer{
		Timeout:   5 * time.Second,
		KeepAlive: 30 * time.Second,
		Control:   safeDialControl,
	}).DialContext,
	ForceAttemptHTTP2:     true,
	MaxIdleConns:          100,
	IdleConnTimeout:       90 * time.Second,
	TLSHandshakeTimeout:   5 * time.Second,
	ExpectContinueTimeout: 1 * time.Second,
}

var SafeHTTPClient = &http.Client{
	Timeout:   10 * time.Second,
	Transport: SafeTransport,
	CheckRedirect: func(*http.Request, []*http.Request) error {
		return http.ErrUseLastResponse
	},
}

func validateExternalURL(raw string) error {
	if raw == "" {
		return nil
	}
	u, err := url.Parse(raw)
	if err != nil {
		return fmt.Errorf("invalid url: %w", err)
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return fmt.Errorf("unsupported url scheme %q (only http/https allowed)", u.Scheme)
	}
	host := u.Hostname()
	if host == "" {
		return fmt.Errorf("url has no host")
	}
	if ip := net.ParseIP(host); ip != nil {
		if isBlockedIP(ip) {
			return fmt.Errorf("url points to a non-public address")
		}
		return nil
	}
	if ips, err := net.LookupIP(host); err == nil {
		for _, ip := range ips {
			if isBlockedIP(ip) {
				return fmt.Errorf("url resolves to a non-public address")
			}
		}
	}
	return nil
}
