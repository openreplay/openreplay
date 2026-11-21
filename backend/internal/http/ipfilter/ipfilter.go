// Package ipfilter matches client IP addresses against a configured list of networks.
package ipfilter

import (
	"errors"
	"fmt"
	"net/netip"
	"strings"
)

// Filter holds the networks parsed from a comma-separated list of IP addresses and CIDR ranges.
type Filter struct {
	prefixes []netip.Prefix
}

// New parses ranges, for example "203.0.113.7,198.51.100.0/24,2001:db8::/32".
// An empty list gives a Filter that matches nothing.
func New(ranges string) (*Filter, error) {
	f := &Filter{}
	for _, item := range strings.Split(ranges, ",") {
		item = strings.TrimSpace(item)
		if item == "" {
			continue
		}
		prefix, err := parsePrefix(item)
		if err != nil {
			return nil, fmt.Errorf("invalid IP range %q: %w", item, err)
		}
		f.prefixes = append(f.prefixes, prefix)
	}
	return f, nil
}

func parsePrefix(item string) (netip.Prefix, error) {
	if !strings.Contains(item, "/") {
		addr, err := parseAddr(item)
		if err != nil {
			return netip.Prefix{}, err
		}
		return netip.PrefixFrom(addr, addr.BitLen()), nil
	}
	prefix, err := netip.ParsePrefix(item)
	if err != nil {
		return netip.Prefix{}, err
	}
	// Contains compares against unmapped addresses, so this prefix could never match.
	if prefix.Addr().Is4In6() {
		return netip.Prefix{}, errors.New("IPv4-mapped prefixes are not supported, use IPv4 notation")
	}
	return prefix.Masked(), nil
}

func parseAddr(ip string) (netip.Addr, error) {
	addr, err := netip.ParseAddr(ip)
	if err != nil {
		return netip.Addr{}, err
	}
	return addr.Unmap().WithZone(""), nil
}

// Contains reports whether ip belongs to one of the networks. Unparsable addresses never match.
func (f *Filter) Contains(ip string) bool {
	if len(f.prefixes) == 0 {
		return false
	}
	addr, err := parseAddr(ip)
	if err != nil {
		return false
	}
	for _, prefix := range f.prefixes {
		if prefix.Contains(addr) {
			return true
		}
	}
	return false
}
