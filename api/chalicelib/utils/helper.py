import random
import re
import string
from typing import Union

import math
import requests

import schemas

local_prefix = 'local-'
from decouple import config


def get_version_number():
    return config("version")


def get_stage_name():
    stage = config("stage")
    return stage[len(local_prefix):] if stage.startswith(local_prefix) else stage


def is_production():
    return get_stage_name() == "production"


def is_staging():
    return get_stage_name() == "staging"


def is_onprem():
    return not is_production() and not is_staging()


def is_local():
    return config("stage").startswith(local_prefix)


def generate_salt():
    return "".join(random.choices(string.hexdigits, k=36))


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


def allow_captcha():
    return config("captcha_server", default=None) is not None and config("captcha_key", default=None) is not None \
           and len(config("captcha_server")) > 0 and len(config("captcha_key")) > 0


def allow_sentry():
    return config("sentryURL", default=None) is not None and len(config("sentryURL")) > 0


def async_post(endpoint, data):
    data["auth"] = config("async_Token")
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
    if isinstance(value, list):
        r = []
        for v in value:
            r.append(string_to_sql_like_with_op(v, op))
        return r
    else:
        _value = value
        if _value is None:
            return _value
        if op.upper() != 'ILIKE':
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


likable_operators = [schemas.SearchEventOperator._starts_with, schemas.SearchEventOperator._ends_with,
                     schemas.SearchEventOperator._contains, schemas.SearchEventOperator._not_contains]


def is_likable(op: schemas.SearchEventOperator):
    return op in likable_operators


def values_for_operator(value: Union[str, list], op: schemas.SearchEventOperator):
    if not is_likable(op):
        return value
    if isinstance(value, list):
        r = []
        for v in value:
            r.append(values_for_operator(v, op))
        return r
    else:
        if value is None:
            return value
        if op == schemas.SearchEventOperator._starts_with:
            return value + '%'
        elif op == schemas.SearchEventOperator._ends_with:
            return '%' + value
        elif op == schemas.SearchEventOperator._contains:
            return '%' + value + '%'
    return value


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


def has_smtp():
    return config("EMAIL_HOST") is not None and len(config("EMAIL_HOST")) > 0


def get_edition():
    return "ee" if "ee" in config("ENTERPRISE_BUILD", default="").lower() else "foss"
