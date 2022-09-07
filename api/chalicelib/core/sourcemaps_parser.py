import requests

from decouple import config


def get_original_trace(key, positions):
    payload = {
        "key": key,
        "positions": positions,
        "padding": 5,
        "bucket": config('sourcemaps_bucket'),
        "S3_HOST": config('S3_HOST'),
        "S3_KEY": config('S3_KEY'),
        "S3_SECRET": config('S3_SECRET'),
        "region": config('sessions_region')
    }
    try:
        r = requests.post(config("sourcemaps_reader"), json=payload,
                          timeout=config("sourcemapTimeout", cast=int, default=5))
        if r.status_code != 200:
            return {}
        return r.json()
    except requests.exceptions.Timeout:
        print("Timeout getting sourcemap")
        return {}
    except Exception as e:
        print("issue getting sourcemap")
        return {}
