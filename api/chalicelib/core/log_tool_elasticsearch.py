from elasticsearch import Elasticsearch
from chalicelib.core import log_tools
import logging

from schemas import schemas

logging.getLogger('elasticsearch').level = logging.ERROR

IN_TY = "elasticsearch"


def get_all(tenant_id):
    return log_tools.get_all_by_tenant(tenant_id=tenant_id, integration=IN_TY)


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


def __get_es_client(host, port, api_key_id, api_key, use_ssl=False, timeout=15):
    scheme = "http" if host.startswith("http") else "https"
    host = host.replace("http://", "").replace("https://", "")
    try:
        args = {
            "hosts": [{"host": host, "port": port, "scheme": scheme}],
            "verify_certs": False,
            "request_timeout": timeout,
            "api_key": (api_key_id, api_key)
        }
        es = Elasticsearch(
            **args
        )
        r = es.ping()
        if not r and not use_ssl:
            return __get_es_client(host, port, api_key_id, api_key, use_ssl=True, timeout=timeout)
        if not r:
            return None
    except Exception as err:
        print("================exception connecting to ES host:")
        print(err)
        return None
    return es


def ping(tenant_id, data: schemas.IntegrationElasticsearchTestSchema):
    es = __get_es_client(data.host, data.port, data.api_key_id, data.api_key, timeout=3)
    if es is None:
        return {"state": False}
    return {"state": es.ping()}
