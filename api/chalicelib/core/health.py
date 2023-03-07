import requests
from decouple import config

from chalicelib.utils import pg_client

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


def check_be_service(service_name):
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
            print("expected JSON, received:")
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


def get_health():
    health_map = {
        "databases": {
            "postgres": __check_database_pg
        },
        "ingestionPipeline": {
            "redis": __not_supported
        },
        "backendServices": {
            "alerts": check_be_service("alerts"),
            "assets": check_be_service("assets"),
            "assist": check_be_service("assist"),
            "chalice": check_be_service("chalice"),
            "db": check_be_service("db"),
            "ender": check_be_service("ender"),
            "frontend": check_be_service("frontend"),
            "heuristics": check_be_service("heuristics"),
            "http": check_be_service("http"),
            "ingress-nginx": check_be_service("ingress-nginx"),
            "integrations": check_be_service("integrations"),
            "peers": check_be_service("peers"),
            "quickwit": check_be_service("quickwit"),
            "sink": check_be_service("sink"),
            "sourcemapreader": check_be_service("sourcemapreader"),
            "storage": check_be_service("storage"),
            "utilities": check_be_service("utilities")
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
