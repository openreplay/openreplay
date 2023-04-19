from ssl import SSLCertVerificationError
from urllib.parse import urlparse

import redis
import requests
from decouple import config

from chalicelib.utils import pg_client


def app_connection_string(name, port, path):
    namespace = config("POD_NAMESPACE", default="app")
    conn_string = config("CLUSTER_URL", default="svc.cluster.local")
    return f"http://{name}.{namespace}.{conn_string}:{port}/{path}"


HEALTH_ENDPOINTS = {
    "alerts": app_connection_string("alerts-openreplay", 8888, "metrics"),
    "assets": app_connection_string("assets-openreplay", 8888, "metrics"),
    "assist": app_connection_string("assist-openreplay", 8888, "metrics"),
    "chalice": app_connection_string("chalice-openreplay", 8888, "metrics"),
    "db": app_connection_string("db-openreplay", 8888, "metrics"),
    "ender": app_connection_string("ender-openreplay", 8888, "metrics"),
    "heuristics": app_connection_string("heuristics-openreplay", 8888, "metrics"),
    "http": app_connection_string("http-openreplay", 8888, "metrics"),
    "ingress-nginx": app_connection_string("ingress-nginx-openreplay", 80, "healthz"),
    "integrations": app_connection_string("integrations-openreplay", 8888, "metrics"),
    "peers": app_connection_string("peers-openreplay", 8888, "health"),
    "sink": app_connection_string("sink-openreplay", 8888, "metrics"),
    "sourcemaps-reader": app_connection_string(
        "sourcemapreader-openreplay", 8888, "health"
    ),
    "storage": app_connection_string("storage-openreplay", 8888, "metrics"),
}


def __check_database_pg(*_):
    fail_response = {
        "health": False,
        "details": {
            "errors": ["Postgres health-check failed"]
        }
    }
    with pg_client.PostgresClient() as cur:
        try:
            cur.execute("SHOW server_version;")
            server_version = cur.fetchone()
        except Exception as e:
            print("!! health failed: postgres not responding")
            print(str(e))
            return fail_response
        try:
            cur.execute("SELECT openreplay_version() AS version;")
            schema_version = cur.fetchone()
        except Exception as e:
            print("!! health failed: openreplay_version not defined")
            print(str(e))
            return fail_response
    return {
        "health": True,
        "details": {
            # "version": server_version["server_version"],
            # "schema": schema_version["version"]
        }
    }


def __not_supported(*_):
    return {"errors": ["not supported"]}


def __always_healthy(*_):
    return {
        "health": True,
        "details": {}
    }


def __check_be_service(service_name):
    def fn(*_):
        fail_response = {
            "health": False,
            "details": {
                "errors": ["server health-check failed"]
            }
        }
        try:
            results = requests.get(HEALTH_ENDPOINTS.get(service_name), timeout=2)
            if results.status_code != 200:
                print(f"!! issue with the {service_name}-health code:{results.status_code}")
                print(results.text)
                # fail_response["details"]["errors"].append(results.text)
                return fail_response
        except requests.exceptions.Timeout:
            print(f"!! Timeout getting {service_name}-health")
            # fail_response["details"]["errors"].append("timeout")
            return fail_response
        except Exception as e:
            print(f"!! Issue getting {service_name}-health response")
            print(str(e))
            try:
                print(results.text)
                # fail_response["details"]["errors"].append(results.text)
            except:
                print("couldn't get response")
                # fail_response["details"]["errors"].append(str(e))
            return fail_response
        return {
            "health": True,
            "details": {}
        }

    return fn


def __check_redis(*_):
    fail_response = {
        "health": False,
        "details": {"errors": ["server health-check failed"]}
    }
    if config("REDIS_STRING", default=None) is None:
        # fail_response["details"]["errors"].append("REDIS_STRING not defined in env-vars")
        return fail_response

    try:
        u = urlparse(config("REDIS_STRING"))
        r = redis.Redis(host=u.hostname, port=u.port, socket_timeout=2)
        r.ping()
    except Exception as e:
        print("!! Issue getting redis-health response")
        print(str(e))
        # fail_response["details"]["errors"].append(str(e))
        return fail_response

    return {
        "health": True,
        "details": {
            # "version": r.execute_command('INFO')['redis_version']
        }
    }


def __check_SSL(*_):
    fail_response = {
        "health": False,
        "details": {
            "errors": ["SSL Certificate health-check failed"]
        }
    }
    try:
        requests.get(config("SITE_URL"), verify=True, allow_redirects=True)
    except Exception as e:
        print("!! health failed: SSL Certificate")
        print(str(e))
        return fail_response
    return {
        "health": True,
        "details": {}
    }


def __get_sessions_stats(*_):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify("""SELECT COALESCE(SUM(sessions_count),0) AS s_c, 
                                      COALESCE(SUM(events_count),0) AS e_c
                               FROM public.sessions_count;""")
        cur.execute(query)
        row = cur.fetchone()
    return {
        "numberOfSessionsCaptured": row["s_c"],
        "numberOfEventCaptured": row["e_c"]
    }


def get_health():
    health_map = {
        "databases": {
            "postgres": __check_database_pg
        },
        "ingestionPipeline": {
            "redis": __check_redis
        },
        "backendServices": {
            "alerts": __check_be_service("alerts"),
            "assets": __check_be_service("assets"),
            "assist": __check_be_service("assist"),
            "chalice": __always_healthy,
            "db": __check_be_service("db"),
            "ender": __check_be_service("ender"),
            "frontend": __always_healthy,
            "heuristics": __check_be_service("heuristics"),
            "http": __check_be_service("http"),
            "ingress-nginx": __always_healthy,
            "integrations": __check_be_service("integrations"),
            "peers": __check_be_service("peers"),
            "sink": __check_be_service("sink"),
            "sourcemaps-reader": __check_be_service("sourcemaps-reader"),
            "storage": __check_be_service("storage")
        },
        "details": __get_sessions_stats,
        "ssl": __check_SSL
    }
    for parent_key in health_map.keys():
        if isinstance(health_map[parent_key], dict):
            for element_key in health_map[parent_key]:
                health_map[parent_key][element_key] = health_map[parent_key][element_key]()
        else:
            health_map[parent_key] = health_map[parent_key]()
    return health_map
