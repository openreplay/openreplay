from chalicelib.utils import helper
from chalicelib.utils import ch_client
from chalicelib.utils.TimeUTC import TimeUTC


def get_by_session_id(session_id):
    with ch_client.ClickHouseClient() as ch:
        ch_query = """\
                SELECT
                       datetime,url,type,duration,ttfb,header_size,encoded_body_size,decoded_body_size,success
                FROM resources
                WHERE session_id = toUInt64(%(session_id)s);"""
        params = {"session_id": session_id}
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
