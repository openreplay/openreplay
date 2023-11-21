import math
import random
import re
import string
import uuid
import zoneinfo
from calendar import monthrange
from datetime import datetime, timedelta
from typing import Union
from urllib.parse import urlparse

from decouple import config

UTC_ZI = zoneinfo.ZoneInfo("UTC")


class TimeUTC:
    MS_MINUTE = 60 * 1000
    MS_HOUR = MS_MINUTE * 60
    MS_DAY = MS_HOUR * 24
    MS_WEEK = MS_DAY * 7
    MS_MONTH = MS_DAY * 30
    MS_MONTH_TRUE = (
        monthrange(
            datetime.now(UTC_ZI).astimezone(UTC_ZI).year,
            datetime.now(UTC_ZI).astimezone(UTC_ZI).month,
        )[1]
        * MS_DAY
    )
    RANGE_VALUE = None

    @staticmethod
    def midnight(delta_days=0):
        return int(
            (datetime.now(UTC_ZI) + timedelta(delta_days))
            .replace(hour=0, minute=0, second=0, microsecond=0)
            .astimezone(UTC_ZI)
            .timestamp()
            * 1000
        )

    @staticmethod
    def __now(delta_days=0, delta_minutes=0, delta_seconds=0):
        return (
            datetime.now(UTC_ZI)
            + timedelta(days=delta_days, minutes=delta_minutes, seconds=delta_seconds)
        ).astimezone(UTC_ZI)

    @staticmethod
    def now(delta_days=0, delta_minutes=0, delta_seconds=0):
        return int(
            TimeUTC.__now(
                delta_days=delta_days,
                delta_minutes=delta_minutes,
                delta_seconds=delta_seconds,
            ).timestamp()
            * 1000
        )

    @staticmethod
    def month_start(delta_month=0):
        month = TimeUTC.__now().month + delta_month
        return int(
            datetime.now(UTC_ZI)
            .replace(
                year=TimeUTC.__now().year
                + ((-12 + month) // 12 if month % 12 <= 0 else month // 12),
                month=12 + month % 12
                if month % 12 <= 0
                else month % 12
                if month > 12
                else month,
                day=1,
                hour=0,
                minute=0,
                second=0,
                microsecond=0,
            )
            .astimezone(UTC_ZI)
            .timestamp()
            * 1000
        )

    @staticmethod
    def year_start(delta_year=0):
        return int(
            datetime.now(UTC_ZI)
            .replace(
                year=TimeUTC.__now().year + delta_year,
                month=1,
                day=1,
                hour=0,
                minute=0,
                second=0,
                microsecond=0,
            )
            .astimezone(UTC_ZI)
            .timestamp()
            * 1000
        )

    @staticmethod
    def custom(year=None, month=None, day=None, hour=None, minute=None):
        args = locals()
        return int(
            datetime.now(UTC_ZI)
            .replace(
                **{key: args[key] for key in args if args[key] is not None},
                second=0,
                microsecond=0,
            )
            .astimezone(UTC_ZI)
            .timestamp()
            * 1000
        )

    @staticmethod
    def future(delta_day, delta_hour, delta_minute, minutes_period=None, start=None):
        this_time = TimeUTC.__now()
        if delta_day == -1:
            if (
                this_time.hour < delta_hour
                or this_time.hour == delta_hour
                and this_time.minute < delta_minute
            ):
                return TimeUTC.custom(hour=delta_hour, minute=delta_minute)

            return TimeUTC.custom(
                day=TimeUTC.__now(1).day, hour=delta_hour, minute=delta_minute
            )
        elif delta_day > -1:
            if (
                this_time.weekday() < delta_day
                or this_time.weekday() == delta_day
                and (
                    this_time.hour < delta_hour
                    or this_time.hour == delta_hour
                    and this_time.minute < delta_minute
                )
            ):
                return TimeUTC.custom(
                    day=TimeUTC.__now(delta_day - this_time.weekday()).day,
                    hour=delta_hour,
                    minute=delta_minute,
                )

            return TimeUTC.custom(
                day=TimeUTC.__now(7 + delta_day - this_time.weekday()).day,
                hour=delta_hour,
                minute=delta_minute,
            )
        if start is not None:
            return start + minutes_period * 60 * 1000

        return TimeUTC.now(delta_minutes=minutes_period)

    @staticmethod
    def from_ms_timestamp(ts):
        return datetime.fromtimestamp(ts // 1000, UTC_ZI)

    @staticmethod
    def to_human_readable(ts, fmt="%Y-%m-%d %H:%M:%S UTC"):
        return datetime.utcfromtimestamp(ts // 1000).strftime(fmt)

    @staticmethod
    def human_to_timestamp(ts, pattern="%Y-%m-%dT%H:%M:%S.%f"):
        return int(datetime.strptime(ts, pattern).timestamp() * 1000)

    @staticmethod
    def datetime_to_timestamp(date):
        if date is None:
            return None
        if isinstance(date, str):
            fp = date.find(".")
            if fp > 0:
                date += "0" * (6 - len(date[fp + 1 :]))
            date = datetime.fromisoformat(date)
        return int(datetime.timestamp(date) * 1000)

    @staticmethod
    def get_start_end_from_range(range_value):
        range_value = range_value.upper()
        if TimeUTC.RANGE_VALUE is None:
            this_instant = TimeUTC.now()
            TimeUTC.RANGE_VALUE = {
                "TODAY": {"start": TimeUTC.midnight(), "end": this_instant},
                "YESTERDAY": {
                    "start": TimeUTC.midnight(delta_days=-1),
                    "end": TimeUTC.midnight(),
                },
                "LAST_7_DAYS": {
                    "start": TimeUTC.midnight(delta_days=-7),
                    "end": this_instant,
                },
                "LAST_30_DAYS": {
                    "start": TimeUTC.midnight(delta_days=-30),
                    "end": this_instant,
                },
                "THIS_MONTH": {"start": TimeUTC.month_start(), "end": this_instant},
                "LAST_MONTH": {
                    "start": TimeUTC.month_start(delta_month=-1),
                    "end": TimeUTC.month_start(),
                },
                "THIS_YEAR": {"start": TimeUTC.year_start(), "end": this_instant},
                "CUSTOM_RANGE": {
                    "start": TimeUTC.midnight(delta_days=-7),
                    "end": this_instant,
                },  # Default is 7 days
            }
        return (
            TimeUTC.RANGE_VALUE[range_value]["start"],
            TimeUTC.RANGE_VALUE[range_value]["end"],
        )

    @staticmethod
    def get_utc_offset():
        return int(
            (
                datetime.now(UTC_ZI).now() - datetime.now(UTC_ZI).replace(tzinfo=None)
            ).total_seconds()
            * 1000
        )

    @staticmethod
    def trunc_day(timestamp):
        dt = TimeUTC.from_ms_timestamp(timestamp)
        return TimeUTC.datetime_to_timestamp(
            dt.replace(hour=0, minute=0, second=0, microsecond=0).astimezone(UTC_ZI)
        )

    @staticmethod
    def trunc_week(timestamp):
        dt = TimeUTC.from_ms_timestamp(timestamp)
        start = dt - timedelta(days=dt.weekday())
        return TimeUTC.datetime_to_timestamp(
            start.replace(hour=0, minute=0, second=0, microsecond=0).astimezone(UTC_ZI)
        )


def get_stage_name():
    return "OpenReplay"


def random_string():
    return str(uuid.uuid4())


def list_to_camel_case(items: list[dict], flatten: bool = False) -> list[dict]:
    for i in range(len(items)):
        if flatten:
            items[i] = flatten_nested_dicts(items[i])
        items[i] = dict_to_camel_case(items[i])

    return items


def dict_to_camel_case(variable, delimiter="_", ignore_keys=[]):
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
                aux[key_to_camel_case(key, delimiter)] = dict_to_camel_case(
                    variable[key]
                )
            elif isinstance(variable[key], list):
                aux[key_to_camel_case(key, delimiter)] = list_to_camel_case(
                    variable[key]
                )
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


def variable_to_snake_case(variable, delimiter="_", split_number=False):
    if isinstance(variable, str):
        return key_to_snake_case(variable, delimiter, split_number)
    elif isinstance(variable, dict):
        aux = {}
        for key in variable.keys():
            if isinstance(variable[key], dict):
                aux[
                    key_to_snake_case(key, delimiter, split_number)
                ] = variable_to_snake_case(variable[key], delimiter, split_number)
            else:
                aux[key_to_snake_case(key, delimiter, split_number)] = variable[key]
        return aux
    else:
        return variable


def key_to_camel_case(snake_str, delimiter="_"):
    if snake_str.startswith(delimiter):
        snake_str = snake_str[1:]
    components = snake_str.split(delimiter)
    return components[0] + "".join(x.title() for x in components[1:])


def key_to_snake_case(name, delimiter="_", split_number=False):
    s1 = re.sub("(.)([A-Z][a-z]+)", rf"\1{delimiter}\2", name)
    return re.sub(
        "([a-z])([A-Z0-9])" if split_number else "([a-z0-9])([A-Z])",
        rf"\1{delimiter}\2",
        s1,
    ).lower()


TRACK_TIME = True


def allow_captcha():
    return (
        config("captcha_server", default=None) is not None
        and config("captcha_key", default=None) is not None
        and len(config("captcha_server")) > 0
        and len(config("captcha_key")) > 0
    )


def string_to_sql_like(value):
    value = re.sub(" +", " ", value)
    value = value.replace("*", "%")
    if value.startswith("^"):
        value = value[1:]
    elif not value.startswith("%"):
        value = "%" + value

    if value.endswith("$"):
        value = value[:-1]
    elif not value.endswith("%"):
        value = value + "%"
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
        if op.upper() != "ILIKE":
            return _value.replace("%", "%%")
        _value = _value.replace("*", "%")
        if _value.startswith("^"):
            _value = _value[1:]
        elif not _value.startswith("%"):
            _value = "%" + _value

        if _value.endswith("$"):
            _value = _value[:-1]
        elif not _value.endswith("%"):
            _value = _value + "%"
        return _value.replace("%", "%%")


def is_alphabet_space_dash(word):
    r = re.compile("^[a-zA-Z -]*$")
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
        result.append(
            {
                "key": key_to_snake_case(k) if key is None else key,
                "data": {"value": data[k]},
            }
        )
        if k + "Progress" in data:
            result[-1]["data"]["progress"] = data[k + "Progress"]
        if "chart" in data:
            result[-1]["data"]["chart"] = []
            for c in data["chart"]:
                result[-1]["data"]["chart"].append(
                    {"timestamp": c["timestamp"], "value": c[k]}
                )
    return result


def get_issue_title(issue_type):
    return {
        "click_rage": "Click Rage",
        "dead_click": "Dead Click",
        "excessive_scrolling": "Excessive Scrolling",
        "bad_request": "Bad Request",
        "missing_resource": "Missing Image",
        "memory": "High Memory Usage",
        "cpu": "High CPU",
        "slow_resource": "Slow Resource",
        "slow_page_load": "Slow Page",
        "crash": "Crash",
        "ml_cpu": "High CPU",
        "ml_memory": "High Memory Usage",
        "ml_dead_click": "Dead Click",
        "ml_click_rage": "Click Rage",
        "ml_mouse_thrashing": "Mouse Thrashing",
        "ml_excessive_scrolling": "Excessive Scrolling",
        "ml_slow_resources": "Slow Resource",
        "custom": "Custom Event",
        "js_exception": "Error",
        "custom_event_error": "Custom Error",
        "js_error": "Error",
    }.get(issue_type, issue_type)


def __progress(old_val, new_val):
    return (
        ((old_val - new_val) / new_val) * 100
        if new_val > 0
        else 0
        if old_val == 0
        else 100
    )


def __decimal_limit(value, limit):
    factor = pow(10, limit)
    value = math.floor(value * factor)
    if value % factor == 0:
        return value // factor
    return value / factor


def old_search_payload_to_flat(values):
    # in case the old search body was passed
    if values.get("events") is not None:
        for v in values["events"]:
            v["isEvent"] = True
        for v in values.get("filters", []):
            v["isEvent"] = False
        values["filters"] = values.pop("events") + values.get("filters", [])
    return values


def is_saml2_available():
    return config("hastSAML2", default=False, cast=bool)


def get_domain():
    _url = config("SITE_URL")
    if not _url.startswith("http"):
        _url = "http://" + _url
    return ".".join(urlparse(_url).netloc.split(".")[-2:])


def obfuscate(text, keep_last: int = 4):
    if text is None or not isinstance(text, str):
        return text
    if len(text) <= keep_last:
        return "*" * len(text)
    return "*" * (len(text) - keep_last) + text[-keep_last:]


def cast_session_id_to_string(data):
    if not isinstance(data, dict) and not isinstance(data, list):
        return data
    if isinstance(data, list):
        for i, item in enumerate(data):
            data[i] = cast_session_id_to_string(item)
    elif isinstance(data, dict):
        keys = data.keys()
        if "sessionId" in keys:
            data["sessionId"] = str(data["sessionId"])
        else:
            for key in keys:
                data[key] = cast_session_id_to_string(data[key])
    return data
