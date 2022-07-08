from chalicelib.utils import helper
from chalicelib.utils import ch_client
from chalicelib.utils.TimeUTC import TimeUTC
from decouple import config


def get_by_session_id(session_id, project_id, start_ts, duration):
    with ch_client.ClickHouseClient() as ch:
        delta = config("events_ts_delta", cast=int, default=60 * 60) * 1000
        ch_query = """\
                SELECT
                       datetime,url,type,duration,ttfb,header_size,encoded_body_size,decoded_body_size,success,coalesce(status,if(success, 200, status)) AS status
                FROM resources
                WHERE session_id = toUInt64(%(session_id)s) 
                    AND project_id=%(project_id)s
                    AND datetime >= toDateTime(%(res_start_ts)s / 1000)
                    AND datetime <= toDateTime(%(res_end_ts)s / 1000);"""
        params = {"session_id": session_id, "project_id": project_id, "start_ts": start_ts, "duration": duration,
                  "res_start_ts": start_ts - delta, "res_end_ts": start_ts + duration + delta, }
        rows = ch.execute(query=ch_query, params=params)
        results = []
        for r in rows:
            r["datetime"] = TimeUTC.datetime_to_timestamp(r["datetime"])
            # TODO: remove this once the tracker is fixed
            if isinstance(r["url"], bytes):
                try:
                    r["url"] = r["url"].decode("utf-8")
                except UnicodeDecodeError:
                    continue
            results.append(r)
        return helper.list_to_camel_case(results)
