import schemas
from chalicelib.utils import pg_client, helper
from chalicelib.utils.event_filter_definition import SupportedFilter


def get_key_values(project_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                f"""\
                SELECT ARRAY_AGG(DISTINCT s.user_os
                       ORDER BY s.user_os) FILTER ( WHERE s.user_os IS NOT NULL AND s.platform='web')                                             AS {meta_type.USEROS},
                       ARRAY_AGG(DISTINCT s.user_browser
                       ORDER BY s.user_browser)
                       FILTER ( WHERE s.user_browser IS NOT NULL AND s.platform='web')                                                            AS {meta_type.USERBROWSER},
                       ARRAY_AGG(DISTINCT s.user_device
                       ORDER BY s.user_device)
                       FILTER ( WHERE s.user_device IS NOT NULL AND s.user_device != '' AND s.platform='web')                                      AS {meta_type.USERDEVICE},
                       ARRAY_AGG(DISTINCT s.user_country
                       ORDER BY s.user_country)
                       FILTER ( WHERE s.user_country IS NOT NULL AND s.platform='web')::text[]                                                     AS {meta_type.USERCOUNTRY},
                       ARRAY_AGG(DISTINCT s.user_id
                       ORDER BY s.user_id) FILTER ( WHERE s.user_id IS NOT NULL AND s.user_id != 'none' AND s.user_id != '' AND s.platform='web') AS {meta_type.USERID},
                       ARRAY_AGG(DISTINCT s.user_anonymous_id
                       ORDER BY s.user_anonymous_id) FILTER ( WHERE s.user_anonymous_id IS NOT NULL AND s.user_anonymous_id != 'none' AND s.user_anonymous_id != '' AND s.platform='web') AS {meta_type.USERANONYMOUSID},
                       ARRAY_AGG(DISTINCT s.rev_id
                       ORDER BY s.rev_id) FILTER ( WHERE s.rev_id IS NOT NULL AND s.platform='web')                                                AS {meta_type.REVID},
                       ARRAY_AGG(DISTINCT p.referrer
                       ORDER BY p.referrer)
                       FILTER ( WHERE p.referrer != '' )                                                                      AS {meta_type.REFERRER},

                       ARRAY_AGG(DISTINCT s.user_os
                       ORDER BY s.user_os) FILTER ( WHERE s.user_os IS NOT NULL AND s.platform='ios' )                        AS {meta_type.USEROS_IOS},
                       ARRAY_AGG(DISTINCT s.user_device
                       ORDER BY s.user_device)
                       FILTER ( WHERE s.user_device IS NOT NULL AND s.user_device != '' AND s.platform='ios')                 AS {meta_type.USERDEVICE},
                       ARRAY_AGG(DISTINCT s.user_country
                       ORDER BY s.user_country)
                       FILTER ( WHERE s.user_country IS NOT NULL AND s.platform='ios')::text[]                                AS {meta_type.USERCOUNTRY_IOS},
                       ARRAY_AGG(DISTINCT s.user_id
                       ORDER BY s.user_id) FILTER ( WHERE s.user_id IS NOT NULL AND s.user_id != 'none' AND s.user_id != '' AND s.platform='ios') AS {meta_type.USERID_IOS},
                       ARRAY_AGG(DISTINCT s.user_anonymous_id
                       ORDER BY s.user_anonymous_id) FILTER ( WHERE s.user_anonymous_id IS NOT NULL AND s.user_anonymous_id != 'none' AND s.user_anonymous_id != '' AND s.platform='ios') AS {meta_type.USERANONYMOUSID_IOS},
                       ARRAY_AGG(DISTINCT s.rev_id
                       ORDER BY s.rev_id) FILTER ( WHERE s.rev_id IS NOT NULL AND s.platform='ios')                                                AS {meta_type.REVID_IOS}
                FROM public.sessions AS s
                         LEFT JOIN events.pages AS p USING (session_id)
                WHERE s.project_id = %(site_id)s;""",
                {"site_id": project_id}
            )
        )

        row = cur.fetchone()
        for k in row.keys():
            if row[k] is None:
                row[k] = []
            elif len(row[k]) > 500:
                row[k] = row[k][:500]
    return helper.dict_to_CAPITAL_keys(row)


def get_top_key_values(project_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                f"""\
                SELECT {",".join([f"ARRAY((SELECT value FROM public.autocomplete WHERE project_id = %(site_id)s AND type='{k}' GROUP BY value ORDER BY COUNT(*) DESC LIMIT %(limit)s)) AS {k}" for k in SUPPORTED_TYPES.keys()])};""",
                {"site_id": project_id, "limit": 5}
            )
        )

        row = cur.fetchone()
    return helper.dict_to_CAPITAL_keys(row)


def __generic_query(typename):
    return f"""\
                SELECT value, type 
                FROM ((SELECT value, type  
                        FROM public.autocomplete
                        WHERE
                          project_id = %(project_id)s
                          AND type ='{typename}'
                          AND value ILIKE %(svalue)s
                        ORDER BY value
                        LIMIT 5)
                      UNION
                      (SELECT value, type  
                        FROM public.autocomplete
                        WHERE
                          project_id = %(project_id)s
                          AND type ='{typename}'
                          AND value ILIKE %(value)s
                        ORDER BY value
                        LIMIT 5)) AS met"""


def __generic_autocomplete(typename):
    def f(project_id, text):
        with pg_client.PostgresClient() as cur:
            query = cur.mogrify(__generic_query(typename),
                                {"project_id": project_id, "value": helper.string_to_sql_like(text),
                                 "svalue": helper.string_to_sql_like("^" + text)})

            cur.execute(query)
            rows = cur.fetchall()
        return rows

    return f


class meta_type:
    USEROS = schemas.FilterType.user_os
    USERBROWSER = schemas.FilterType.user_browser
    USERDEVICE = schemas.FilterType.user_device
    USERCOUNTRY = schemas.FilterType.user_country
    USERID = schemas.FilterType.user_id
    USERANONYMOUSID = schemas.FilterType.user_anonymous_id
    REFERRER = schemas.FilterType.referrer
    REVID = schemas.FilterType.rev_id
    # IOS
    USEROS_IOS = schemas.FilterType.user_os_ios
    USERDEVICE_IOS = schemas.FilterType.user_device_ios
    USERCOUNTRY_IOS = schemas.FilterType.user_country_ios
    USERID_IOS = schemas.FilterType.user_id_ios
    USERANONYMOUSID_IOS = schemas.FilterType.user_anonymous_id_ios
    REVID_IOS = schemas.FilterType.rev_id_ios


SUPPORTED_TYPES = {
    meta_type.USEROS: SupportedFilter(get=__generic_autocomplete(typename=meta_type.USEROS),
                                      query=__generic_query(typename=meta_type.USEROS),
                                      value_limit=0,
                                      starts_with="",
                                      starts_limit=0,
                                      ignore_if_starts_with=["/"]),
    meta_type.USERBROWSER: SupportedFilter(get=__generic_autocomplete(typename=meta_type.USERBROWSER),
                                           query=__generic_query(typename=meta_type.USERBROWSER),
                                           value_limit=0,
                                           starts_with="",
                                           starts_limit=0,
                                           ignore_if_starts_with=["/"]),
    meta_type.USERDEVICE: SupportedFilter(get=__generic_autocomplete(typename=meta_type.USERDEVICE),
                                          query=__generic_query(typename=meta_type.USERDEVICE),
                                          value_limit=3,
                                          starts_with="",
                                          starts_limit=3,
                                          ignore_if_starts_with=["/"]),
    meta_type.USERCOUNTRY: SupportedFilter(get=__generic_autocomplete(typename=meta_type.USERCOUNTRY),
                                           query=__generic_query(typename=meta_type.USERCOUNTRY),
                                           value_limit=2,
                                           starts_with="",
                                           starts_limit=2,
                                           ignore_if_starts_with=["/"]),
    meta_type.USERID: SupportedFilter(get=__generic_autocomplete(typename=meta_type.USERID),
                                      query=__generic_query(typename=meta_type.USERID),
                                      value_limit=2,
                                      starts_with="",
                                      starts_limit=2,
                                      ignore_if_starts_with=["/"]),
    meta_type.USERANONYMOUSID: SupportedFilter(get=__generic_autocomplete(typename=meta_type.USERANONYMOUSID),
                                               query=__generic_query(typename=meta_type.USERANONYMOUSID),
                                               value_limit=3,
                                               starts_with="",
                                               starts_limit=3,
                                               ignore_if_starts_with=["/"]),
    meta_type.REVID: SupportedFilter(get=__generic_autocomplete(typename=meta_type.REVID),
                                     query=__generic_query(typename=meta_type.REVID),
                                     value_limit=0,
                                     starts_with="",
                                     starts_limit=0,
                                     ignore_if_starts_with=["/"]),
    meta_type.REFERRER: SupportedFilter(get=__generic_autocomplete(typename=meta_type.REFERRER),
                                        query=__generic_query(typename=meta_type.REFERRER),
                                        value_limit=5,
                                        starts_with="/",
                                        starts_limit=5,
                                        ignore_if_starts_with=[]),
    # IOS
    meta_type.USEROS_IOS: SupportedFilter(get=__generic_autocomplete(typename=meta_type.USEROS_IOS),
                                          query=__generic_query(typename=meta_type.USEROS_IOS),
                                          value_limit=0,
                                          starts_with="",
                                          starts_limit=0,
                                          ignore_if_starts_with=["/"]),
    meta_type.USERDEVICE_IOS: SupportedFilter(get=__generic_autocomplete(typename=meta_type.USERDEVICE_IOS),
                                              query=__generic_query(typename=meta_type.USERDEVICE_IOS),
                                              value_limit=3,
                                              starts_with="",
                                              starts_limit=3,
                                              ignore_if_starts_with=["/"]),
    meta_type.USERCOUNTRY_IOS: SupportedFilter(get=__generic_autocomplete(typename=meta_type.USERCOUNTRY_IOS),
                                               query=__generic_query(typename=meta_type.USERCOUNTRY_IOS),
                                               value_limit=2,
                                               starts_with="",
                                               starts_limit=2,
                                               ignore_if_starts_with=["/"]),
    meta_type.USERID_IOS: SupportedFilter(get=__generic_autocomplete(typename=meta_type.USERID_IOS),
                                          query=__generic_query(typename=meta_type.USERID_IOS),
                                          value_limit=2,
                                          starts_with="",
                                          starts_limit=2,
                                          ignore_if_starts_with=["/"]),
    meta_type.USERANONYMOUSID_IOS: SupportedFilter(get=__generic_autocomplete(typename=meta_type.USERANONYMOUSID_IOS),
                                                   query=__generic_query(typename=meta_type.USERANONYMOUSID_IOS),
                                                   value_limit=3,
                                                   starts_with="",
                                                   starts_limit=3,
                                                   ignore_if_starts_with=["/"]),
    meta_type.REVID_IOS: SupportedFilter(get=__generic_autocomplete(typename=meta_type.REVID_IOS),
                                         query=__generic_query(typename=meta_type.REVID_IOS),
                                         value_limit=0,
                                         starts_with="",
                                         starts_limit=0,
                                         ignore_if_starts_with=["/"]),

}


def search(text, meta_type, project_id):
    rows = []
    if meta_type.upper() not in list(SUPPORTED_TYPES.keys()):
        return {"errors": ["unsupported type"]}
    rows += SUPPORTED_TYPES[meta_type.upper()].get(project_id=project_id, text=text)
    if meta_type.upper() + "_IOS" in list(SUPPORTED_TYPES.keys()):
        rows += SUPPORTED_TYPES[meta_type.upper() + "_IOS"].get(project_id=project_id, text=text)
    return {"data": rows}
