import requests

from chalicelib.utils.helper import environ


def get_original_trace(key, positions):
    payload = {
        "key": key,
        "positions": positions,
        "padding": 5,
        "bucket": environ['sourcemaps_bucket'],
        "S3_HOST": environ['S3_HOST'],
        "S3_KEY": environ['S3_KEY'],
        "S3_SECRET": environ['S3_SECRET'],
        "region": environ['sessions_region']
    }
    r = requests.post(environ["sourcemaps_reader"], json=payload)
    if r.status_code != 200:
        return {}

    return r.json()
