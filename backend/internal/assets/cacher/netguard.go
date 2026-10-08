package cacher

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/http"
	"sync/atomic"
	"syscall"
	"time"
)

type blockedAddrError struct {
	addr string
}

func (e *blockedAddrError) Error() string {
	return fmt.Sprintf("blocked address %s", e.addr)
}

var blockedNets = func() []*net.IPNet {
	cidrs := []string{
		"0.0.0.0/8",       // "this" network
		"100.64.0.0/10",   // carrier-grade NAT
		"192.0.0.0/24",    // IETF protocol assignments
		"192.0.2.0/24",    // documentation
		"198.18.0.0/15",   // benchmarking
		"198.51.100.0/24", // documentation
		"203.0.113.0/24",  // documentation
		"240.0.0.0/4",     // reserved + broadcast
		"64:ff9b::/96",    // NAT64
		"64:ff9b:1::/48",  // local-use NAT64
		"2001::/32",       // Teredo (embeds IPv4)
		"2001:db8::/32",   // documentation
		"2002::/16",       // 6to4 (embeds IPv4)
		"fec0::/10",       // deprecated site-local
	}
	nets := make([]*net.IPNet, 0, len(cidrs))
	for _, c := range cidrs {
		_, n, err := net.ParseCIDR(c)
		if err != nil {
			panic(err)
		}
		nets = append(nets, n)
	}
	return nets
}()

func isBlockedIP(ip net.IP) bool {
	if ip.IsLoopback() || ip.IsPrivate() || ip.IsUnspecified() ||
		ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() ||
		ip.IsInterfaceLocalMulticast() || ip.IsMulticast() {
		return true
	}
	for _, n := range blockedNets {
		if n.Contains(ip) {
			return true
		}
	}
	return false
}

type dialFunc func(ctx context.Context, network, addr string) (net.Conn, error)

func guardedDialer(allowPrivate bool) dialFunc {
	if allowPrivate {
		return (&net.Dialer{
			Timeout:   5 * time.Second,
			KeepAlive: 30 * time.Second,
		}).DialContext
	}
	return func(ctx context.Context, network, addr string) (net.Conn, error) {
		var attempted atomic.Int32
		dialer := &net.Dialer{
			Timeout:   5 * time.Second,
			KeepAlive: 30 * time.Second,
			ControlContext: func(_ context.Context, _, address string, _ syscall.RawConn) error {
				host, _, err := net.SplitHostPort(address)
				if err != nil {
					return err
				}
				ip := net.ParseIP(host)
				if ip == nil || isBlockedIP(ip) {
					return &blockedAddrError{addr: address}
				}
				attempted.Add(1)
				return nil
			},
		}
		conn, err := dialer.DialContext(ctx, network, addr)
		if err != nil && attempted.Load() > 0 {
			var blocked *blockedAddrError
			if errors.As(err, &blocked) {
				return nil, fmt.Errorf("dial %s: allowed addresses unreachable", addr)
			}
		}
		return conn, err
	}
}

func (c *cacher) checkRedirect(req *http.Request, via []*http.Request) error {
	if len(via) >= 10 {
		return errors.New("stopped after 10 redirects")
	}
	if !c.origins.allows(req.URL) {
		return &originNotAllowedError{origin: originKey(req.URL)}
	}
	return c.checkProxiedDestination(req)
}

func (c *cacher) checkProxiedDestination(req *http.Request) error {
	if c.allowPrivate {
		return nil
	}
	proxy, err := c.proxy(req.URL)
	if err != nil || proxy == nil {
		return nil
	}
	return checkDestination(req.Context(), req.URL.Hostname())
}

func checkDestination(ctx context.Context, host string) error {
	if ip := net.ParseIP(host); ip != nil {
		if isBlockedIP(ip) {
			return &blockedAddrError{addr: host}
		}
		return nil
	}
	addrs, err := net.DefaultResolver.LookupIPAddr(ctx, host)
	if err != nil {
		return err
	}
	for _, a := range addrs {
		if isBlockedIP(a.IP) {
			return &blockedAddrError{addr: a.IP.String()}
		}
	}
	return nil
}
