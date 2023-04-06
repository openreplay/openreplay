from urllib.parse import urlparse

import redis
import requests
# from confluent_kafka.admin import AdminClient
from decouple import config

from chalicelib.utils import pg_client, ch_client


def app_connection_string(name, port, path):
    namespace = config("POD_NAMESPACE", default="app")
    conn_string = config("CLUSTER_URL", default="svc.cluster.local")
    return (
        "http://" + name + "." + namespace + "." + conn_string + ":" + port + "/" + path
    )


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


def __check_database_pg():
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


def __not_supported():
    return {"errors": ["not supported"]}


def __always_healthy():
    return {
        "health": True,
        "details": {}
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


def __check_redis():
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


def get_health():
    health_map = {
        "databases": {
            "postgres": __check_database_pg,
            "clickhouse": __check_database_ch
        },
        "ingestionPipeline": {
            **({"redis": __check_redis} if config("REDIS_STRING", default=None)
                                           and len(config("REDIS_STRING")) > 0 else {}),
            # "kafka": __check_kafka
            "kafka": __always_healthy
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
            # "quickwit": __check_be_service("quickwit"),
            "sink": __check_be_service("sink"),
            "sourcemaps-reader": __check_be_service("sourcemaps-reader"),
            "storage": __check_be_service("storage")
        }
    }
    for parent_key in health_map.keys():
        for element_key in health_map[parent_key]:
            health_map[parent_key][element_key] = health_map[parent_key][element_key]()
    return health_map


def __check_database_ch():
    fail_response = {
        "health": False,
        "details": {"errors": ["server health-check failed"]}
    }
    with ch_client.ClickHouseClient() as ch:
        try:
            server_version = ch.execute("SELECT version() AS server_version;")
        except Exception as e:
            print("!! health failed: clickhouse not responding")
            print(str(e))
            return fail_response

        schema_version = ch.execute("""SELECT 1
                                       FROM system.functions
                                       WHERE name = 'openreplay_version';""")
        if len(schema_version) > 0:
            schema_version = ch.execute("SELECT openreplay_version() AS version;")
            schema_version = schema_version[0]["version"]
        else:
            print("!! health failed: clickhouse schema is outdated")
            schema_version = "unknown"
            # fail_response["details"]["errors"].append("clickhouse schema is outdated")
            return fail_response
    return {
        "health": True,
        "details": {
            # "version": server_version[0]["server_version"],
            # "schema": schema_version,
            # **errors
        }
    }

# def __check_kafka():
#     fail_response = {
#         "health": False,
#         "details": {"errors": ["server health-check failed"]}
#     }
#     if config("KAFKA_SERVERS", default=None) is None:
#         fail_response["details"]["errors"].append("KAFKA_SERVERS not defined in env-vars")
#         return fail_response
#
#     try:
#         a = AdminClient({'bootstrap.servers': config("KAFKA_SERVERS"), "socket.connection.setup.timeout.ms": 3000})
#         topics = a.list_topics().topics
#         if not topics:
#             raise Exception('topics not found')
#
#     except Exception as e:
#         print("!! Issue getting kafka-health response")
#         print(str(e))
#         fail_response["details"]["errors"].append(str(e))
#         return fail_response
#
#     return {
#         "health": True,
#         "details": {}
#     }
