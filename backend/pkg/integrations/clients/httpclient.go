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
	return false
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
