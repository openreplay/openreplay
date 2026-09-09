import ipaddress
import socket
from urllib.parse import urlparse, urlunparse

import requests
from decouple import config
from requests.adapters import HTTPAdapter


def get_allowed_hosts():
    return {h.strip().lower() for h in config("WEBHOOK_ALLOWED_HOSTS", default="").split(",") if h.strip()}


def resolve_public_ip(endpoint):
    """Validates that the endpoint resolves to public IPs only and returns one of them,
    so the request can be pinned to it (protects against DNS-rebinding between check and request).
    Returns None (no validation, no pinning) for hosts listed in WEBHOOK_ALLOWED_HOSTS."""
    parsed = urlparse(endpoint)
    hostname = parsed.hostname
    if not hostname:
        raise ValueError(f"endpoint has no valid hostname: {endpoint}")
    if hostname.lower() in get_allowed_hosts():
        return None
    try:
        resolved = socket.getaddrinfo(hostname, parsed.port or (443 if parsed.scheme == "https" else 80),
                                      proto=socket.IPPROTO_TCP)
    except socket.gaierror as e:
        raise ValueError(f"endpoint hostname could not be resolved: {hostname}") from e
    ips = []
    for family, _, _, _, sockaddr in resolved:
        ip = ipaddress.ip_address(sockaddr[0])
        if not ip.is_global:
            raise ValueError(f"endpoint resolves to a non-public IP address: {hostname} -> {ip}")
        ips.append(ip)
    return str(ips[0])


class PinnedHostHTTPSAdapter(HTTPAdapter):
    """Keeps TLS SNI and certificate validation bound to the original hostname
    while the connection itself targets a pre-resolved IP."""

    def __init__(self, hostname, **kwargs):
        self._hostname = hostname
        super().__init__(**kwargs)

    def init_poolmanager(self, *args, **kwargs):
        kwargs["server_hostname"] = self._hostname
        kwargs["assert_hostname"] = self._hostname
        super().init_poolmanager(*args, **kwargs)


def post_json(endpoint, json_data, headers=None, timeout=None):
    """POSTs JSON to an endpoint after validating that it targets a public IP (SSRF guard).
    The connection is pinned to the validated IP and redirects are not followed.
    Raises ValueError if the endpoint is non-public and not in WEBHOOK_ALLOWED_HOSTS."""
    endpoint = str(endpoint)
    headers = headers or {}
    pinned_ip = resolve_public_ip(endpoint)
    if pinned_ip is None:
        return requests.post(url=endpoint, json=json_data, headers=headers, timeout=timeout,
                             allow_redirects=False)
    parsed = urlparse(endpoint)
    hostname = parsed.hostname
    ip_host = f"[{pinned_ip}]" if ":" in pinned_ip else pinned_ip
    netloc = ip_host if parsed.port is None else f"{ip_host}:{parsed.port}"
    pinned_url = urlunparse(parsed._replace(netloc=netloc))
    headers = {**headers, "Host": hostname if parsed.port is None else f"{hostname}:{parsed.port}"}
    with requests.Session() as s:
        if parsed.scheme == "https":
            s.mount("https://", PinnedHostHTTPSAdapter(hostname))
        return s.post(url=pinned_url, json=json_data, headers=headers, timeout=timeout,
                      allow_redirects=False)


ALLOWED_SCHEMES = ("http", "https")
ALLOWED_PORTS = (80, 443)


def is_safe_external_url(url: str) -> bool:
    """SSRF guard for URLs fetched server-side on behalf of user-controlled data
    (e.g. sourcemap URLs coming from error stack frames): http(s) only, no
    embedded credentials, standard ports, and every IP the hostname resolves to
    must be public (blocks loopback, RFC1918, link-local incl. cloud metadata
    endpoints, CGNAT, ULA, reserved and multicast ranges).

    Note: DNS is resolved here for validation only; the actual fetch resolves
    again, so consumers must re-validate at connect time to rule out DNS
    rebinding (sourcemapreader does this via its lookup hook)."""
    try:
        p = urlparse(url)
    except ValueError:
        return False
    if p.scheme not in ALLOWED_SCHEMES:
        return False
    if not p.hostname or p.username or p.password:
        return False
    try:
        port = p.port
    except ValueError:
        return False
    port = port or (443 if p.scheme == "https" else 80)
    if port not in ALLOWED_PORTS:
        return False
    try:
        infos = socket.getaddrinfo(p.hostname, port, proto=socket.IPPROTO_TCP)
    except (socket.gaierror, UnicodeError):
        return False
    if len(infos) == 0:
        return False
    for info in infos:
        try:
            ip = ipaddress.ip_address(info[4][0])
        except ValueError:
            return False
        if not ip.is_global or ip.is_multicast:
            return False
    return True
