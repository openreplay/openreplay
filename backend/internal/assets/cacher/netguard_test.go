package cacher

import (
	"context"
	"errors"
	"net"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"golang.org/x/net/http/httpproxy"
)

func TestIsBlockedIP(t *testing.T) {
	blocked := []string{
		"127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1",
		"169.254.169.254", "0.0.0.0", "0.1.2.3", "100.64.0.1", "192.0.0.1",
		"192.0.2.1", "198.18.0.1", "198.51.100.1", "203.0.113.1",
		"224.0.0.1", "240.0.0.1", "255.255.255.255", "168.63.129.16",
		"::1", "::", "fc00::1", "fd12::1", "fe80::1", "fec0::1", "ff02::1",
		"::ffff:10.0.0.1", "::ffff:127.0.0.1", "64:ff9b::a00:1",
		"2001::1", "2001:db8::1", "2002:a00:1::1",
	}
	for _, s := range blocked {
		if !isBlockedIP(net.ParseIP(s)) {
			t.Errorf("%s should be blocked", s)
		}
	}
	allowed := []string{"8.8.8.8", "1.1.1.1", "172.32.0.1", "2606:4700::1111", "2001:4860::1", "::ffff:8.8.8.8"}
	for _, s := range allowed {
		if isBlockedIP(net.ParseIP(s)) {
			t.Errorf("%s should be allowed", s)
		}
	}
}

func assertBlocked(t *testing.T, err error) {
	t.Helper()
	var blocked *blockedAddrError
	if !errors.As(err, &blocked) {
		t.Fatalf("expected blockedAddrError, got %v", err)
	}
}

func TestGuardedDialerBlocksLoopback(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("secret"))
	}))
	defer srv.Close()

	client := &http.Client{Transport: &http.Transport{DialContext: guardedDialer(false, nil)}}
	_, err := client.Get(srv.URL)
	assertBlocked(t, err)

	// hostname path: resolver + ControlContext, not only literal IPs
	u, _ := url.Parse(srv.URL)
	_, port, _ := net.SplitHostPort(u.Host)
	_, err = client.Get("http://localhost:" + port + "/")
	assertBlocked(t, err)

	client = &http.Client{Transport: &http.Transport{DialContext: guardedDialer(true, nil)}}
	res, err := client.Get(srv.URL)
	if err != nil {
		t.Fatalf("allowPrivate dial failed: %v", err)
	}
	res.Body.Close()
}

func TestGuardedDialerBlocksRedirectTarget(t *testing.T) {
	internal := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("secret"))
	}))
	defer internal.Close()

	var first = true
	transport := &http.Transport{DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
		if first {
			first = false
			return (&net.Dialer{}).DialContext(ctx, network, addr)
		}
		return guardedDialer(false, nil)(ctx, network, addr)
	}}
	edge := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, internal.URL, http.StatusFound)
	}))
	defer edge.Close()

	_, err := (&http.Client{Transport: transport}).Get(edge.URL)
	assertBlocked(t, err)
}

func TestProxyAddrs(t *testing.T) {
	cases := map[string]string{
		"http://Proxy.Corp:3128": "proxy.corp:3128",
		"10.0.0.5":               "10.0.0.5:80", // no scheme, no port
		"socks5h://10.0.0.5":     "10.0.0.5:1080",
		"https://proxy.corp":     "proxy.corp:443",
		"http://пример.рф":       "xn--e1afmkfd.xn--p1ai:80",
	}
	for raw, want := range cases {
		got := proxyAddrs(&httpproxy.Config{HTTPProxy: raw})
		if _, ok := got[want]; !ok || len(got) != 1 {
			t.Errorf("%s: want {%s}, got %v", raw, want, got)
		}
	}
	if len(proxyAddrs(&httpproxy.Config{})) != 0 {
		t.Fatal("empty config must produce no exemptions")
	}
}

func TestGuardedDialerExemptsProxyAddress(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("via proxy"))
	}))
	defer srv.Close()
	u, _ := url.Parse(srv.URL)

	exempt := proxyAddrs(&httpproxy.Config{HTTPProxy: "http://" + u.Host})
	client := &http.Client{Transport: &http.Transport{DialContext: guardedDialer(false, exempt)}}
	res, err := client.Get(srv.URL)
	if err != nil {
		t.Fatalf("exempted proxy address should be dialed: %v", err)
	}
	res.Body.Close()

	other := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	defer other.Close()
	_, err = client.Get(other.URL)
	assertBlocked(t, err)
}

func TestCheckDestination(t *testing.T) {
	ctx := context.Background()
	assertBlocked(t, checkDestination(ctx, "10.0.0.1"))
	assertBlocked(t, checkDestination(ctx, "localhost"))
	if err := checkDestination(ctx, "8.8.8.8"); err != nil {
		t.Fatalf("public literal should pass: %v", err)
	}
}

func TestCheckProxiedDestination(t *testing.T) {
	req, _ := http.NewRequest("GET", "http://10.0.0.1/app.css", nil)

	noProxy := &cacher{proxy: (&httpproxy.Config{}).ProxyFunc()}
	if err := noProxy.checkProxiedDestination(req); err != nil {
		t.Fatalf("without proxy the dialer is the guard, got %v", err)
	}

	proxied := &cacher{proxy: (&httpproxy.Config{HTTPProxy: "http://proxy.example:3128"}).ProxyFunc()}
	assertBlocked(t, proxied.checkProxiedDestination(req))

	allowed := &cacher{allowPrivate: true, proxy: proxied.proxy}
	if err := allowed.checkProxiedDestination(req); err != nil {
		t.Fatalf("allowPrivate should skip the check, got %v", err)
	}
}

func TestCheckRedirectRejectsProxyAddress(t *testing.T) {
	c := &cacher{
		origins:    originSet{},
		proxy:      (&httpproxy.Config{HTTPSProxy: "http://proxy.internal:3128"}).ProxyFunc(),
		proxyAddrs: proxyAddrs(&httpproxy.Config{HTTPSProxy: "http://proxy.internal:3128"}),
	}
	first, _ := http.NewRequest("GET", "https://cdn.example/a.css", nil)
	toProxy, _ := http.NewRequest("GET", "http://PROXY.internal:3128/squid-internal-mgr/info", nil)
	assertBlocked(t, c.checkRedirect(toProxy, []*http.Request{first}))
	assertBlocked(t, c.checkProxyTarget(toProxy.URL))
	if err := c.checkProxyTarget(first.URL); err != nil {
		t.Fatalf("non-proxy target should pass, got %v", err)
	}
}

func TestCheckRedirectDropsRequestHeadersCrossOrigin(t *testing.T) {
	var seen []string
	internal := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		seen = append(seen, r.Header.Get("X-Api-Key"))
	}))
	defer internal.Close()
	edge := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		seen = append(seen, r.Header.Get("X-Api-Key"))
		if r.URL.Path == "/same" {
			http.Redirect(w, r, "/done", http.StatusFound)
			return
		}
		if r.URL.Path == "/done" {
			return
		}
		http.Redirect(w, r, internal.URL, http.StatusFound)
	}))
	defer edge.Close()

	c := &cacher{
		origins:        originSet{},
		requestHeaders: map[string]string{"X-Api-Key": "secret"},
		allowPrivate:   true,
		proxy:          (&httpproxy.Config{}).ProxyFunc(),
	}
	client := &http.Client{CheckRedirect: c.checkRedirect}
	for _, path := range []string{"/cross", "/same"} {
		req, _ := http.NewRequest("GET", edge.URL+path, nil)
		for k, v := range c.requestHeaders {
			req.Header.Set(k, v)
		}
		res, err := client.Do(req)
		if err != nil {
			t.Fatalf("%s: %v", path, err)
		}
		res.Body.Close()
	}
	want := []string{"secret", "", "secret", "secret"}
	if len(seen) != len(want) {
		t.Fatalf("want %v, got %v", want, seen)
	}
	for i := range want {
		if seen[i] != want[i] {
			t.Fatalf("hop %d: want %q, got %q (all: %v)", i, want[i], seen[i], seen)
		}
	}
}

func TestCheckRedirectRejectsUnsupportedScheme(t *testing.T) {
	c := &cacher{origins: originSet{}, proxy: (&httpproxy.Config{}).ProxyFunc()}
	first, _ := http.NewRequest("GET", "https://cdn.example/a.css", nil)
	ftp, _ := http.NewRequest("GET", "ftp://cdn.example/a.css", nil)
	var scheme *unsupportedSchemeError
	if err := c.checkRedirect(ftp, []*http.Request{first}); !errors.As(err, &scheme) {
		t.Fatalf("expected unsupportedSchemeError, got %v", err)
	}
}

func TestGuardedDialerKeepsRealErrorForMixedAddresses(t *testing.T) {
	saved := lookupIPAddr
	defer func() { lookupIPAddr = saved }()
	lookupIPAddr = func(_ context.Context, _ string) ([]net.IPAddr, error) {
		return []net.IPAddr{{IP: net.ParseIP("10.0.0.1")}, {IP: net.ParseIP("8.8.8.8")}}, nil
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	_, err := guardedDialer(false, nil)(ctx, "tcp", "mixed.example:80")
	var blocked *blockedAddrError
	if err == nil || errors.As(err, &blocked) {
		t.Fatalf("dial error of the allowed address must surface, got %v", err)
	}

	lookupIPAddr = func(_ context.Context, _ string) ([]net.IPAddr, error) {
		return []net.IPAddr{{IP: net.ParseIP("10.0.0.1")}, {IP: net.ParseIP("127.0.0.1")}}, nil
	}
	_, err = guardedDialer(false, nil)(ctx, "tcp", "internal.example:80")
	assertBlocked(t, err)
}
