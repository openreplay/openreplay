from calendar import monthrange
from datetime import datetime, timedelta

import zoneinfo

UTC_ZI = zoneinfo.ZoneInfo("UTC")


class TimeUTC:
    MS_MINUTE = 60 * 1000
    MS_HOUR = MS_MINUTE * 60
    MS_DAY = MS_HOUR * 24
    MS_WEEK = MS_DAY * 7
    MS_MONTH = MS_DAY * 30
    MS_MONTH_TRUE = monthrange(datetime.now(UTC_ZI).astimezone(UTC_ZI).year,
                               datetime.now(UTC_ZI).astimezone(UTC_ZI).month)[1] * MS_DAY
    RANGE_VALUE = None

    @staticmethod
    def midnight(delta_days=0):
        return int((datetime.now(UTC_ZI) + timedelta(delta_days)) \
                   .replace(hour=0, minute=0, second=0, microsecond=0) \
                   .astimezone(UTC_ZI).timestamp() * 1000)

    @staticmethod
    def __now(delta_days=0, delta_minutes=0, delta_seconds=0):
        return (datetime.now(UTC_ZI) + timedelta(days=delta_days, minutes=delta_minutes, seconds=delta_seconds)) \
            .astimezone(UTC_ZI)

    @staticmethod
    def now(delta_days=0, delta_minutes=0, delta_seconds=0):
        return int(TimeUTC.__now(delta_days=delta_days, delta_minutes=delta_minutes,
                                 delta_seconds=delta_seconds).timestamp() * 1000)

    @staticmethod
    def month_start(delta_month=0):
        month = TimeUTC.__now().month + delta_month
        return int(datetime.now(UTC_ZI) \
                   .replace(year=TimeUTC.__now().year + ((-12 + month) // 12 if month % 12 <= 0 else month // 12),
                            month=12 + month % 12 if month % 12 <= 0 else month % 12 if month > 12 else month,
                            day=1,
                            hour=0, minute=0,
                            second=0,
                            microsecond=0) \
                   .astimezone(UTC_ZI).timestamp() * 1000)

    @staticmethod
    def year_start(delta_year=0):
        return int(datetime.now(UTC_ZI) \
                   .replace(year=TimeUTC.__now().year + delta_year, month=1, day=1, hour=0, minute=0, second=0,
                            microsecond=0) \
                   .astimezone(UTC_ZI).timestamp() * 1000)

    @staticmethod
    def custom(year=None, month=None, day=None, hour=None, minute=None):
        args = locals()
        return int(datetime.now(UTC_ZI) \
                   .replace(**{key: args[key] for key in args if args[key] is not None}, second=0, microsecond=0) \
                   .astimezone(UTC_ZI).timestamp() * 1000)

    @staticmethod
    def future(delta_day, delta_hour, delta_minute, minutes_period=None, start=None):
        this_time = TimeUTC.__now()
        if delta_day == -1:
            if this_time.hour < delta_hour or this_time.hour == delta_hour and this_time.minute < delta_minute:
                return TimeUTC.custom(hour=delta_hour, minute=delta_minute)

            return TimeUTC.custom(day=TimeUTC.__now(1).day, hour=delta_hour, minute=delta_minute)
        elif delta_day > -1:
            if this_time.weekday() < delta_day or this_time.weekday() == delta_day and (
                    this_time.hour < delta_hour or this_time.hour == delta_hour and this_time.minute < delta_minute):
                return TimeUTC.custom(day=TimeUTC.__now(delta_day - this_time.weekday()).day, hour=delta_hour,
                                      minute=delta_minute)

            return TimeUTC.custom(day=TimeUTC.__now(7 + delta_day - this_time.weekday()).day, hour=delta_hour,
                                  minute=delta_minute)
        if start is not None:
            return start + minutes_period * 60 * 1000

        return TimeUTC.now(delta_minutes=minutes_period)

    @staticmethod
    def from_ms_timestamp(ts):
        return datetime.fromtimestamp(ts // 1000, UTC_ZI)

    @staticmethod
    def to_human_readable(ts, fmt='%Y-%m-%d %H:%M:%S UTC'):
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
                date += '0' * (6 - len(date[fp + 1:]))
            date = datetime.fromisoformat(date)
        return int(datetime.timestamp(date) * 1000)

    @staticmethod
    def get_start_end_from_range(range_value):
        range_value = range_value.upper()
        if TimeUTC.RANGE_VALUE is None:
            this_instant = TimeUTC.now()
            TimeUTC.RANGE_VALUE = {
                "TODAY": {"start": TimeUTC.midnight(), "end": this_instant},
                "YESTERDAY": {"start": TimeUTC.midnight(delta_days=-1), "end": TimeUTC.midnight()},
                "LAST_7_DAYS": {"start": TimeUTC.midnight(delta_days=-7), "end": this_instant},
                "LAST_30_DAYS": {"start": TimeUTC.midnight(delta_days=-30), "end": this_instant},
                "THIS_MONTH": {"start": TimeUTC.month_start(), "end": this_instant},
                "LAST_MONTH": {"start": TimeUTC.month_start(delta_month=-1), "end": TimeUTC.month_start()},
                "THIS_YEAR": {"start": TimeUTC.year_start(), "end": this_instant},
                "CUSTOM_RANGE": {"start": TimeUTC.midnight(delta_days=-7), "end": this_instant}  # Default is 7 days
            }
        return TimeUTC.RANGE_VALUE[range_value]["start"], TimeUTC.RANGE_VALUE[range_value]["end"]

    @staticmethod
    def get_utc_offset():
        return int((datetime.now(UTC_ZI).now() - datetime.now(UTC_ZI).replace(tzinfo=None)).total_seconds() * 1000)

    @staticmethod
    def trunc_day(timestamp):
        dt = TimeUTC.from_ms_timestamp(timestamp)
        return TimeUTC.datetime_to_timestamp(dt
                                             .replace(hour=0, minute=0, second=0, microsecond=0)
                                             .astimezone(UTC_ZI))

    @staticmethod
    def trunc_week(timestamp):
        dt = TimeUTC.from_ms_timestamp(timestamp)
        start = dt - timedelta(days=dt.weekday())
        return TimeUTC.datetime_to_timestamp(start
                                             .replace(hour=0, minute=0, second=0, microsecond=0)
                                             .astimezone(UTC_ZI))
