import math
import random
import re
import string

import requests

local_prefix = 'local-'
from os import environ, path

import json


def get_version_number():
    return environ["version"]


def get_stage_name():
    stage = environ["stage"]
    return stage[len(local_prefix):] if stage.startswith(local_prefix) else stage


def is_production():
    return get_stage_name() == "production"


def is_staging():
    return get_stage_name() == "staging"


def is_onprem():
    return not is_production() and not is_staging()


def is_local():
    return environ["stage"].startswith(local_prefix)


def generate_salt():
    return "".join(random.choices(string.hexdigits, k=36))


def remove_empty_none_values(dictionary):
    aux = {}
    for key in dictionary.keys():
        if dictionary[key] is not None:
            if isinstance(dictionary[key], dict):
                aux[key] = remove_empty_none_values(dictionary[key])
            elif not isinstance(dictionary[key], str) or len(dictionary[key]) > 0:
                aux[key] = dictionary[key]
    return aux


def unique_ordered_list(array):
    uniq = []
    [uniq.append(x) for x in array if x not in uniq]
    return uniq


def unique_unordered_list(array):
    return list(set(array))


def list_to_camel_case(items, flatten=False):
    for i in range(len(items)):
        if flatten:
            items[i] = flatten_nested_dicts(items[i])
        items[i] = dict_to_camel_case(items[i])

    return items


def dict_to_camel_case(variable, delimiter='_', ignore_keys=[]):
    if variable is None:
        return None
    if isinstance(variable, str):
        return variable
    elif isinstance(variable, dict):
        aux = {}
        for key in variable.keys():
            if key in ignore_keys:
                aux[key] = variable[key]
            elif isinstance(variable[key], dict):
                aux[key_to_camel_case(key, delimiter)] = dict_to_camel_case(variable[key])
            elif isinstance(variable[key], list):
                aux[key_to_camel_case(key, delimiter)] = list_to_camel_case(variable[key])
            else:
                aux[key_to_camel_case(key, delimiter)] = variable[key]
        return aux
    else:
        return variable


def dict_to_CAPITAL_keys(variable):
    if variable is None:
        return None
    if isinstance(variable, str):
        return variable.upper()
    elif isinstance(variable, dict):
        aux = {}
        for key in variable.keys():
            if isinstance(variable[key], dict):
                aux[key.upper()] = dict_to_CAPITAL_keys(variable[key])
            else:
                aux[key.upper()] = variable[key]
        return aux
    else:
        return variable


def variable_to_snake_case(variable, delimiter='_', split_number=False):
    if isinstance(variable, str):
        return key_to_snake_case(variable, delimiter, split_number)
    elif isinstance(variable, dict):
        aux = {}
        for key in variable.keys():
            if isinstance(variable[key], dict):
                aux[key_to_snake_case(key, delimiter, split_number)] = variable_to_snake_case(variable[key], delimiter,
                                                                                              split_number)
            else:
                aux[key_to_snake_case(key, delimiter, split_number)] = variable[key]
        return aux
    else:
        return variable


def key_to_camel_case(snake_str, delimiter='_'):
    if snake_str.startswith(delimiter):
        snake_str = snake_str[1:]
    components = snake_str.split(delimiter)
    return components[0] + ''.join(x.title() for x in components[1:])


def key_to_snake_case(name, delimiter='_', split_number=False):
    s1 = re.sub('(.)([A-Z][a-z]+)', fr'\1{delimiter}\2', name)
    return re.sub('([a-z])([A-Z0-9])' if split_number else '([a-z0-9])([A-Z])', fr'\1{delimiter}\2', s1).lower()


TRACK_TIME = True


def __sbool_to_bool(value):
    if value is None or not isinstance(value, str):
        return False
    return value.lower() in ["true", "yes", "1"]


def allow_cron():
    return "allowCron" not in environ or __sbool_to_bool(environ["allowCron"])


def allow_captcha():
    return environ.get("captcha_server") is not None and environ.get("captcha_key") is not None \
           and len(environ["captcha_server"]) > 0 and len(environ["captcha_key"]) > 0


def allow_sentry():
    return "sentry" not in environ or __sbool_to_bool(environ["sentry"])


def async_post(endpoint, data):
    data["auth"] = environ["async_Token"]
    try:
        requests.post(endpoint, timeout=1, json=data)
    except requests.exceptions.ReadTimeout:
        pass


def string_to_sql_like(value):
    value = re.sub(' +', ' ', value)
    value = value.replace("*", "%")
    if value.startswith("^"):
        value = value[1:]
    elif not value.startswith("%"):
        value = '%' + value

    if value.endswith("$"):
        value = value[:-1]
    elif not value.endswith("%"):
        value = value + '%'
    # value = value.replace(" ", "%")
    return value


def string_to_sql_like_with_op(value, op):
    if isinstance(value, list) and len(value) > 0:
        _value = value[0]
    else:
        _value = value
    if _value is None:
        return _value
    if op.lower() != 'ilike':
        return _value.replace("%", "%%")
    _value = _value.replace("*", "%")
    if _value.startswith("^"):
        _value = _value[1:]
    elif not _value.startswith("%"):
        _value = '%' + _value

    if _value.endswith("$"):
        _value = _value[:-1]
    elif not _value.endswith("%"):
        _value = _value + '%'
    return _value.replace("%", "%%")


def is_valid_email(email):
    return re.match(r"[^@]+@[^@]+\.[^@]+", email) is not None


def is_valid_http_url(url):
    regex = re.compile(
        r'^(?:http|ftp)s?://'  # http:// or https://
        r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+(?:[A-Z]{2,6}\.?|[A-Z0-9-]{2,}\.?)|'  # domain...
        r'localhost|'  # localhost...
        r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # ...or ip
        r'(?::\d+)?'  # optional port
        r'(?:/?|[/?]\S+)$', re.IGNORECASE)

    return re.match(regex, url) is not None


def is_valid_url(url):
    regex = re.compile(
        # r'^(?:http|ftp)s?://'  # http:// or https://
        r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+(?:[A-Z]{2,6}\.?|[A-Z0-9-]{2,}\.?)|'  # domain...
        r'localhost|'  # localhost...
        r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # ...or ip
        r'(?::\d+)?'  # optional port
        r'(?:/?|[/?]\S+)$', re.IGNORECASE)

    return re.match(regex, url) is not None


def is_alphabet_space(word):
    r = re.compile("^[a-zA-Z ]*$")
    return r.match(word) is not None


def is_alphabet_latin_space(word):
    r = re.compile("^[a-zA-Z\u00C0-\u00D6\u00D8-\u00f6\u00f8-\u00ff\s ]*$")
    return r.match(word) is not None


def is_alphabet_space_dash(word):
    r = re.compile("^[a-zA-Z -]*$")
    return r.match(word) is not None


def is_alphanumeric_space(word):
    r = re.compile("^[a-zA-Z0-9._\- ]*$")
    return r.match(word) is not None


def merge_lists_by_key(l1, l2, key):
    merged = {}
    for item in l1 + l2:
        if item[key] in merged:
            merged[item[key]].update(item)
        else:
            merged[item[key]] = item
    return [val for (_, val) in merged.items()]


def flatten_nested_dicts(obj):
    if obj is None:
        return None
    result = {}
    for key in obj.keys():
        if isinstance(obj[key], dict):
            result = {**result, **flatten_nested_dicts(obj[key])}
        else:
            result[key] = obj[key]
    return result


def delete_keys_from_dict(d, to_delete):
    if isinstance(to_delete, str):
        to_delete = [to_delete]
    if isinstance(d, dict):
        for single_to_delete in set(to_delete):
            if single_to_delete in d:
                del d[single_to_delete]
        for k, v in d.items():
            delete_keys_from_dict(v, to_delete)
    elif isinstance(d, list):
        for i in d:
            delete_keys_from_dict(i, to_delete)
    return d


def explode_widget(data, key=None):
    result = []
    for k in data.keys():
        if k.endswith("Progress") or k == "chart":
            continue
        result.append({"key": key_to_snake_case(k) if key is None else key, "data": {"value": data[k]}})
        if k + "Progress" in data:
            result[-1]["data"]["progress"] = data[k + "Progress"]
        if "chart" in data:
            result[-1]["data"]["chart"] = []
            for c in data["chart"]:
                result[-1]["data"]["chart"].append({"timestamp": c["timestamp"], "value": c[k]})
    return result


TEMP_PATH = "./" if is_local() else "/tmp/"


def get_issue_title(issue_type):
    return {'click_rage': "Click Rage",
            'dead_click': "Dead Click",
            'excessive_scrolling': "Excessive Scrolling",
            'bad_request': "Bad Request",
            'missing_resource': "Missing Image",
            'memory': "High Memory Usage",
            'cpu': "High CPU",
            'slow_resource': "Slow Resource",
            'slow_page_load': "Slow Page",
            'crash': "Crash",
            'ml_cpu': "High CPU",
            'ml_memory': "High Memory Usage",
            'ml_dead_click': "Dead Click",
            'ml_click_rage': "Click Rage",
            'ml_mouse_thrashing': "Mouse Thrashing",
            'ml_excessive_scrolling': "Excessive Scrolling",
            'ml_slow_resources': "Slow Resource",
            'custom': "Custom Event",
            'js_exception': "Error",
            'custom_event_error': "Custom Error",
            'js_error': "Error"}.get(issue_type, issue_type)


def __progress(old_val, new_val):
    return ((old_val - new_val) / new_val) * 100 if new_val > 0 else 0 if old_val == 0 else 100


def __decimal_limit(value, limit):
    factor = pow(10, limit)
    value = math.floor(value * factor)
    if value % factor == 0:
        return value // factor
    return value / factor


def is_free_open_source_edition():
    return __sbool_to_bool(environ.get("isFOS"))


def is_enterprise_edition():
    return __sbool_to_bool(environ.get("isEE"))


stag_config_file = f"chalicelib/.configs/{environ['stage']}.json"
if not path.isfile(stag_config_file):
    print("!! stage config file not found, using .chalice/config.json only")
else:
    print("!! stage config file found, merging with priority to .chalice/config.json")
    with open(stag_config_file) as json_file:
        config = json.load(json_file)
    environ = {**config, **environ}

if (is_free_open_source_edition() or is_enterprise_edition()) and environ.get("config_file"):
    if not path.isfile(environ.get("config_file")):
        print("!! config file not found, using default environment")
    else:
        with open(environ.get("config_file")) as json_file:
            config = json.load(json_file)
        environ = {**environ, **config}


def get_internal_project_id(project_id64):
    if project_id64 < 0x10000000000000 or project_id64 >= 0x20000000000000:
        return None

    project_id64 = (project_id64 - 0x10000000000000) * 4212451012670231 & 0xfffffffffffff
    if project_id64 > 0xffffffff:
        return None
    project_id = int(project_id64)
    return project_id
