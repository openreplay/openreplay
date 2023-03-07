from urllib.parse import urlparse

import redis
import requests
from decouple import config

from chalicelib.utils import pg_client, ch_client

if config("LOCAL_DEV", cast=bool, default=False):
    HEALTH_ENDPOINTS = {
        "alerts": "http://127.0.0.1:8888/metrics",
        "assets": "http://127.0.0.1:8888/metrics",
        "assist": "http://127.0.0.1:8888/metrics",
        "chalice": "http://127.0.0.1:8888/metrics",
        "db": "http://127.0.0.1:8888/metrics",
        "ender": "http://127.0.0.1:8888/metrics",
        "frontend": "http://127.0.0.1:8888/metrics",
        "heuristics": "http://127.0.0.1:8888/metrics",
        "http": "http://127.0.0.1:8888/metrics",
        "ingress-nginx": "http://127.0.0.1:8888/metrics",
        "integrations": "http://127.0.0.1:8888/metrics",
        "peers": "http://127.0.0.1:8888/metrics",
        "quickwit": "http://127.0.0.1:8888/metrics",
        "sink": "http://127.0.0.1:8888/metrics",
        "sourcemapreader": "http://127.0.0.1:8888/metrics",
        "storage": "http://127.0.0.1:8888/metrics",
        "utilities": "http://127.0.0.1:8888/metrics"
    }

else:
    HEALTH_ENDPOINTS = {
        "alerts": "http://alerts-openreplay.app.svc.cluster.local:8888/metrics",
        "assets": "http://assets-openreplay.app.svc.cluster.local:8888/metrics",
        "assist": "http://assist-openreplay.app.svc.cluster.local:8888/metrics",
        "chalice": "http://chalice-openreplay.app.svc.cluster.local:8888/metrics",
        "db": "http://db-openreplay.app.svc.cluster.local:8888/metrics",
        "ender": "http://ender-openreplay.app.svc.cluster.local:8888/metrics",
        "frontend": "http://frontend-openreplay.app.svc.cluster.local:8888/metrics",
        "heuristics": "http://heuristics-openreplay.app.svc.cluster.local:8888/metrics",
        "http": "http://http-openreplay.app.svc.cluster.local:8888/metrics",
        "ingress-nginx": "http://ingress-nginx-openreplay.app.svc.cluster.local:8888/metrics",
        "integrations": "http://integrations-openreplay.app.svc.cluster.local:8888/metrics",
        "peers": "http://peers-openreplay.app.svc.cluster.local:8888/metrics",
        "quickwit": "http://quickwit-openreplay.app.svc.cluster.local:8888/metrics",
        "sink": "http://sink-openreplay.app.svc.cluster.local:8888/metrics",
        "sourcemapreader": "http://sourcemapreader-openreplay.app.svc.cluster.local:8888/metrics",
        "storage": "http://storage-openreplay.app.svc.cluster.local:8888/metrics",
        "utilities": "http://utilities-openreplay.app.svc.cluster.local:8888/metrics",
    }


def __check_database_pg():
    with pg_client.PostgresClient() as cur:
        cur.execute("SHOW server_version;")
        server_version = cur.fetchone()
        cur.execute("SELECT openreplay_version() AS version;")
        schema_version = cur.fetchone()
    return {
        "health": True,
        "details": {
            "version": server_version["server_version"],
            "schema": schema_version["version"]
        }
    }


def __not_supported():
    return {"errors": ["not supported"]}


def __always_healthy():
    return {
        "health": True,
        "details": {}
    }


def __always_healthy_with_version():
    return {
        "health": True,
        "details": {"version": config("version_number", default="unknown")}
    }


def __check_be_service(service_name):
    def fn():
        fail_response = {
            "health": False,
            "details": {
                "errors": ["server health-check failed"]
            }
        }
        try:
            results = requests.get(HEALTH_ENDPOINTS.get(service_name), timeout=2)
            if results.status_code != 200:
                print(f"!! issue with the storage-health code:{results.status_code}")
                print(results.text)
                fail_response["details"]["errors"].append(results.text)
                return fail_response
        except requests.exceptions.Timeout:
            print(f"!! Timeout getting {service_name}-health")
            fail_response["details"]["errors"].append("timeout")
            return fail_response
        except Exception as e:
            print("!! Issue getting storage-health response")
            print(str(e))
            try:
                print(results.text)
                fail_response["details"]["errors"].append(results.text)
            except:
                print("couldn't get response")
                fail_response["details"]["errors"].append(str(e))
            return fail_response
        return {
            "health": True,
            "details": {}
        }

    return fn


def __check_redis():
    fail_response = {
        "health": False,
        "details": {"errors": ["server health-check failed"]}
    }
    if config("REDIS_STRING", default=None) is None:
        fail_response["details"]["errors"].append("REDIS_STRING not defined in env-vars")
        return fail_response

    try:
        u = urlparse(config("REDIS_STRING"))
        r = redis.Redis(host=u.hostname, port=u.port, socket_timeout=2)
        r.ping()
    except Exception as e:
        print("!! Issue getting assist-health response")
        print(str(e))
        fail_response["details"]["errors"].append(str(e))
        return fail_response

    return {
        "health": True,
        "details": {"version": r.execute_command('INFO')['redis_version']}
    }


def __check_assist():
    pass


def get_health():
    health_map = {
        "databases": {
            "postgres": __check_database_pg,
            "clickhouse": __check_database_ch
        },
        "ingestionPipeline": {
            "redis": __check_redis,
            "kafka": __not_supported
        },
        "backendServices": {
            "alerts": __check_be_service("alerts"),
            "assets": __check_be_service("assets"),
            "assist": __check_assist,
            "chalice": __always_healthy_with_version,
            "db": __check_be_service("db"),
            "ender": __check_be_service("ender"),
            "frontend": __check_be_service("frontend"),
            "heuristics": __check_be_service("heuristics"),
            "http": __check_be_service("http"),
            "ingress-nginx": __always_healthy,
            "integrations": __check_be_service("integrations"),
            "peers": __check_be_service("peers"),
            "quickwit": __check_be_service("quickwit"),
            "sink": __check_be_service("sink"),
            "sourcemapreader": __check_be_service("sourcemapreader"),
            "storage": __check_be_service("storage"),
            "utilities": __check_be_service("utilities")
        },
        # "overall": {
        #   "health": "na",
        #   "details": {
        #     "numberOfEventCaptured": "int",
        #     "numberOfSessionsCaptured": "int"
        #   },
        #   "labels": {
        #     "parent": "information"
        #   }
        # },
        # "ssl": True
    }
    for parent_key in health_map.keys():
        for element_key in health_map[parent_key]:
            health_map[parent_key][element_key] = health_map[parent_key][element_key]()
    return health_map


def __check_database_ch():
    errors = {}
    with ch_client.ClickHouseClient() as ch:
        server_version = ch.execute("SELECT version() AS server_version;")
        schema_version = ch.execute("""SELECT 1
                                       FROM system.functions
                                       WHERE name = 'openreplay_version';""")
        if len(schema_version) > 0:
            schema_version = ch.execute("SELECT openreplay_version()() AS version;")
            schema_version = schema_version[0]["version"]
        else:
            schema_version = "unknown"
            errors = {"errors": ["clickhouse schema is outdated"]}
    return {
        "health": True,
        "details": {
            "version": server_version[0]["server_version"],
            "schema": schema_version,
            **errors
        }
    }


def __check_kafka():
    pass
