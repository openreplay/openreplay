import logging
from urllib.parse import urlparse

import requests

from chalicelib.core.log_tools import log_tools
from chalicelib.utils import ssrf
from chalicelib.utils.log import sanitize
from schemas import schemas

logger = logging.getLogger(__name__)

IN_TY = "elasticsearch"


def get(project_id):
    return log_tools.get(project_id=project_id, integration=IN_TY)


def update(tenant_id, project_id, changes):
    options = {}

    if "host" in changes:
        options["host"] = changes["host"]
    if "apiKeyId" in changes:
        options["apiKeyId"] = changes["apiKeyId"]
    if "apiKey" in changes:
        options["apiKey"] = changes["apiKey"]
    if "indexes" in changes:
        options["indexes"] = changes["indexes"]
    if "port" in changes:
        options["port"] = changes["port"]

    return log_tools.edit(project_id=project_id, integration=IN_TY, changes=options)


def add(tenant_id, project_id, host, api_key_id, api_key, indexes, port):
    options = {
        "host": host, "apiKeyId": api_key_id, "apiKey": api_key, "indexes": indexes, "port": port
    }
    return log_tools.add(project_id=project_id, integration=IN_TY, options=options)


def delete(tenant_id, project_id):
    return log_tools.delete(project_id=project_id, integration=IN_TY)


def add_edit(tenant_id, project_id, data: schemas.IntegrationElasticsearchSchema):
    s = get(project_id)
    if s is not None:
        return update(tenant_id=tenant_id, project_id=project_id,
                      changes={"host": data.host, "apiKeyId": data.api_key_id, "apiKey": data.api_key,
                               "indexes": data.indexes, "port": data.port})
    else:
        return add(tenant_id=tenant_id, project_id=project_id,
                   host=data.host, api_key=data.api_key, api_key_id=data.api_key_id,
                   indexes=data.indexes, port=data.port)


def __candidate_urls(host, port):
    """Builds the base URLs to probe: the given scheme if the host has one, otherwise https then http.
    Returns [] for anything that is not a bare host (path, credentials, query...)."""
    host = host.strip()
    has_scheme = host.startswith("http://") or host.startswith("https://")
    parsed = urlparse(host if has_scheme else f"https://{host}")
    if not parsed.hostname or parsed.username or parsed.password or parsed.port \
            or parsed.path not in ("", "/") or parsed.query or parsed.fragment:
        return []
    schemes = [parsed.scheme] if has_scheme else ["https", "http"]
    hostname = f"[{parsed.hostname}]" if ":" in parsed.hostname else parsed.hostname
    return [f"{scheme}://{hostname}:{port}/" for scheme in schemes]


def ping(tenant_id, data: schemas.IntegrationElasticsearchTestSchema):
    """Checks that the host answers `HEAD /` as an Elasticsearch node (2xx with the X-Elastic-Product header,
    the same check the official client's ping() performs).
    host/port are user-controlled; without a guard this is a blind-SSRF oracle against internal networks and
    cloud metadata endpoints. The request goes through ssrf.head(): the host must resolve to public IPs only
    (or be listed in INTEGRATION_ALLOWED_HOSTS), and the connection is pinned to the validated IP so a DNS
    rebinding between the check and the connection cannot redirect it."""
    if not isinstance(data.port, int) or not 0 < data.port <= 65535:
        logger.warning(f"blocked Elasticsearch integration with invalid port: {sanitize(str(data.port))}")
        return {"state": False}
    urls = __candidate_urls(data.host, data.port)
    if len(urls) == 0:
        logger.warning(f"blocked Elasticsearch integration with invalid host: {sanitize(data.host)}")
        return {"state": False}
    headers = {"Authorization": f"ApiKey {data.api_key}"}
    for url in urls:
        try:
            r = ssrf.head(endpoint=url, headers=headers, timeout=3,
                          allowed_hosts=ssrf.get_integration_allowed_hosts())
        except ValueError as e:
            logger.warning(f"blocked Elasticsearch integration with non-public host: {sanitize(data.host)} ({e})")
            return {"state": False, "error": "host must be a public hostname or IP address"}
        except requests.RequestException as e:
            logger.debug(f"ES connection test failed for {sanitize(url)}: {e}")
            continue
        if r.ok and r.headers.get("X-Elastic-Product") == "Elasticsearch":
            return {"state": True}
    return {"state": False}
