from urllib.parse import urlparse

import requests
from decouple import config

from chalicelib.core import sourcemaps_parser
from chalicelib.utils.storage import StorageClient, generators


def presign_share_urls(project_id, urls):
    results = []
    for u in urls:
        results.append(StorageClient.get_presigned_url_for_sharing(bucket=config('sourcemaps_bucket'), expires_in=120,
                                                               key=generators.generate_file_key_from_url(project_id, u),
                                                               check_exists=True))
    return results


def presign_upload_urls(project_id, urls):
    results = []
    for u in urls:
        results.append(StorageClient.get_presigned_url_for_upload(bucket=config('sourcemaps_bucket'),
                                                              expires_in=1800,
                                                              key=generators.generate_file_key_from_url(project_id, u)))
    return results


def __format_frame_old(f):
    if f.get("context") is None:
        f["context"] = []
    else:
        f["context"] = [[f["line"], f["context"]]]
    url = f.pop("url")
    f["absPath"] = url
    f["filename"] = urlparse(url).path
    f["lineNo"] = f.pop("line")
    f["colNo"] = f.pop("column")
    f["function"] = f.pop("func")
    return f


def __frame_is_valid(f):
    return "columnNumber" in f and \
           "lineNumber" in f and \
           "fileName" in f


def __format_frame(f):
    f["context"] = []  # no context by default
    if "source" in f:
        f.pop("source")
    url = f.pop("fileName")
    f["absPath"] = url
    f["filename"] = urlparse(url).path
    f["lineNo"] = f.pop("lineNumber")
    f["colNo"] = f.pop("columnNumber")
    f["function"] = f.pop("functionName") if "functionName" in f else None
    return f


def format_payload(p, truncate_to_first=False):
    if type(p) is list:
        return [__format_frame(f) for f in (p[:1] if truncate_to_first else p) if __frame_is_valid(f)]
    if type(p) is dict:
        stack = p.get("stack", [])
        return [__format_frame_old(f) for f in (stack[:1] if truncate_to_first else stack)]
    return []


def url_exists(url):
    try:
        r = requests.head(url, allow_redirects=False)
        return r.status_code == 200 and "text/html" not in r.headers.get("Content-Type", "")
    except Exception as e:
        print(f"!! Issue checking if URL exists: {url}")
        print(e)
        return False


def get_traces_group(project_id, payload):
    frames = format_payload(payload)

    results = [{}] * len(frames)
    payloads = {}
    all_exists = True
    for i, u in enumerate(frames):
        file_exists_in_bucket = False
        file_exists_in_server = False
        file_url = u["absPath"]
        key = generators.generate_file_key_from_url(project_id, file_url)  # use filename instead?
        params_idx = file_url.find("?")
        if file_url and len(file_url) > 0 \
                and not (file_url[:params_idx] if params_idx > -1 else file_url).endswith(".js"):
            print(f"{u['absPath']} sourcemap is not a JS file")
            payloads[key] = None

        if key not in payloads:
            file_exists_in_bucket = len(file_url) > 0 and StorageClient.exists(config('sourcemaps_bucket'), key)
            if len(file_url) > 0 and not file_exists_in_bucket:
                print(f"{u['absPath']} sourcemap (key '{key}') doesn't exist in S3 looking in server")
                if not file_url.endswith(".map"):
                    file_url += '.map'
                file_exists_in_server = url_exists(file_url)
                file_exists_in_bucket = file_exists_in_server
            all_exists = all_exists and file_exists_in_bucket
            if not file_exists_in_bucket and not file_exists_in_server:
                print(f"{u['absPath']} sourcemap (key '{key}') doesn't exist in S3 nor server")
                payloads[key] = None
            else:
                payloads[key] = []
        results[i] = dict(u)
        results[i]["frame"] = dict(u)
        if payloads[key] is not None:
            payloads[key].append({"resultIndex": i, "frame": dict(u), "URL": file_url,
                                  "position": {"line": u["lineNo"], "column": u["colNo"]},
                                  "isURL": file_exists_in_server})

    for key in payloads.keys():
        if payloads[key] is None:
            continue
        key_results = sourcemaps_parser.get_original_trace(
            key=payloads[key][0]["URL"] if payloads[key][0]["isURL"] else key,
            positions=[o["position"] for o in payloads[key]],
            is_url=payloads[key][0]["isURL"])
        if key_results is None:
            all_exists = False
            continue
        for i, r in enumerate(key_results):
            res_index = payloads[key][i]["resultIndex"]
            # function name search  by frontend lib is better than sourcemaps' one in most cases
            if results[res_index].get("function") is not None:
                r["function"] = results[res_index]["function"]
            r["frame"] = payloads[key][i]["frame"]
            results[res_index] = r
    return fetch_missed_contexts(results), all_exists


def get_js_cache_path(fullURL):
    p = urlparse(fullURL)
    return p.scheme + '/' + p.netloc + p.path  # TODO (Also in go assets library): What if URL with query? (like versions)


MAX_COLUMN_OFFSET = 60


def fetch_missed_contexts(frames):
    source_cache = {}
    for i in range(len(frames)):
        if frames[i] and frames[i].get("context") and len(frames[i]["context"]) > 0:
            continue
        file_abs_path = frames[i]["frame"]["absPath"]
        if file_abs_path in source_cache:
            file = source_cache[file_abs_path]
        else:
            file_path = get_js_cache_path(file_abs_path)
            file = StorageClient.get_file(config('js_cache_bucket'), file_path)
            if file is None:
                print(f"Missing abs_path: {file_abs_path}, file {file_path} not found in {config('js_cache_bucket')}")
            source_cache[file_abs_path] = file
        if file is None:
            continue
        lines = file.split("\n")

        if frames[i]["lineNo"] is None:
            print("no original-source found for frame in sourcemap results")
            frames[i] = frames[i]["frame"]
            frames[i]["originalMapping"] = False

        l = frames[i]["lineNo"] - 1  # starts from 1
        c = frames[i]["colNo"] - 1  # starts from 1
        if len(lines) == 1:
            print(f"minified asset")
            l = frames[i]["frame"]["lineNo"] - 1  # starts from 1
            c = frames[i]["frame"]["colNo"] - 1  # starts from 1
        elif l >= len(lines):
            print(f"line number {l} greater than file length {len(lines)}")
            continue

        line = lines[l]
        offset = c - MAX_COLUMN_OFFSET
        if offset < 0:  # if the line is short
            offset = 0
        frames[i]["context"].append([frames[i]["lineNo"], line[offset: c + MAX_COLUMN_OFFSET + 1]])
    return frames
