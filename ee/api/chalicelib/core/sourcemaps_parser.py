import requests

from chalicelib.utils.helper import environ


def get_original_trace(key, positions):
    payload = {
        "key": key,
        "positions": positions,
        "padding": 5,
        "bucket": environ['sourcemaps_bucket'],
        "bucket_config": {
            "aws_access_key_id": environ["sourcemaps_bucket_key"],
            "aws_secret_access_key": environ["sourcemaps_bucket_secret"],
            "aws_region": environ["sourcemaps_bucket_region"]
        }
    }
    r = requests.post(environ["sourcemaps"], json=payload)
    if r.status_code != 200:
        return {}

    return r.json()
