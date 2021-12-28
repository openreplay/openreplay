import schemas
from chalicelib.utils import pg_client, helper
from chalicelib.utils.event_filter_definition import SupportedFilter


def get_key_values(project_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                f"""\
                SELECT ARRAY_AGG(DISTINCT s.user_os
                       ORDER BY s.user_os) FILTER ( WHERE s.user_os IS NOT NULL AND s.platform='web')                                             AS {schemas.FilterType.user_os},
                       ARRAY_AGG(DISTINCT s.user_browser
                       ORDER BY s.user_browser)
                       FILTER ( WHERE s.user_browser IS NOT NULL AND s.platform='web')                                                            AS {schemas.FilterType.user_browser},
                       ARRAY_AGG(DISTINCT s.user_device
                       ORDER BY s.user_device)
                       FILTER ( WHERE s.user_device IS NOT NULL AND s.user_device != '' AND s.platform='web')                                      AS {schemas.FilterType.user_device},
                       ARRAY_AGG(DISTINCT s.user_country
                       ORDER BY s.user_country)
                       FILTER ( WHERE s.user_country IS NOT NULL AND s.platform='web')::text[]                                                     AS {schemas.FilterType.user_country},
                       ARRAY_AGG(DISTINCT s.user_id
                       ORDER BY s.user_id) FILTER ( WHERE s.user_id IS NOT NULL AND s.user_id != 'none' AND s.user_id != '' AND s.platform='web') AS {schemas.FilterType.user_id},
                       ARRAY_AGG(DISTINCT s.user_anonymous_id
                       ORDER BY s.user_anonymous_id) FILTER ( WHERE s.user_anonymous_id IS NOT NULL AND s.user_anonymous_id != 'none' AND s.user_anonymous_id != '' AND s.platform='web') AS {schemas.FilterType.user_anonymous_id},
                       ARRAY_AGG(DISTINCT s.rev_id
                       ORDER BY s.rev_id) FILTER ( WHERE s.rev_id IS NOT NULL AND s.platform='web')                                                AS {schemas.FilterType.rev_id},
                       ARRAY_AGG(DISTINCT p.referrer
                       ORDER BY p.referrer)
                       FILTER ( WHERE p.referrer != '' )                                                                      AS {schemas.FilterType.referrer},

                       ARRAY_AGG(DISTINCT s.utm_source
                       ORDER BY s.utm_source) FILTER ( WHERE s.utm_source IS NOT NULL AND s.utm_source != 'none' AND s.utm_source != '') AS {schemas.FilterType.utm_source},
                       ARRAY_AGG(DISTINCT s.utm_medium
                       ORDER BY s.utm_medium) FILTER ( WHERE s.utm_medium IS NOT NULL AND s.utm_medium != 'none' AND s.utm_medium != '') AS {schemas.FilterType.utm_medium},
                       ARRAY_AGG(DISTINCT s.utm_campaign
                       ORDER BY s.utm_campaign) FILTER ( WHERE s.utm_campaign IS NOT NULL AND s.utm_campaign != 'none' AND s.utm_campaign != '') AS {schemas.FilterType.utm_campaign},

                       ARRAY_AGG(DISTINCT s.user_os
                       ORDER BY s.user_os) FILTER ( WHERE s.user_os IS NOT NULL AND s.platform='ios' )                        AS {schemas.FilterType.user_os_ios},
                       ARRAY_AGG(DISTINCT s.user_device
                       ORDER BY s.user_device)
                       FILTER ( WHERE s.user_device IS NOT NULL AND s.user_device != '' AND s.platform='ios')                 AS {schemas.FilterType.user_device_ios},
                       ARRAY_AGG(DISTINCT s.user_country
                       ORDER BY s.user_country)
                       FILTER ( WHERE s.user_country IS NOT NULL AND s.platform='ios')::text[]                                AS {schemas.FilterType.user_country_ios},
                       ARRAY_AGG(DISTINCT s.user_id
                       ORDER BY s.user_id) FILTER ( WHERE s.user_id IS NOT NULL AND s.user_id != 'none' AND s.user_id != '' AND s.platform='ios') AS {schemas.FilterType.user_id_ios},
                       ARRAY_AGG(DISTINCT s.user_anonymous_id
                       ORDER BY s.user_anonymous_id) FILTER ( WHERE s.user_anonymous_id IS NOT NULL AND s.user_anonymous_id != 'none' AND s.user_anonymous_id != '' AND s.platform='ios') AS {schemas.FilterType.user_anonymous_id_ios},
                       ARRAY_AGG(DISTINCT s.rev_id
                       ORDER BY s.rev_id) FILTER ( WHERE s.rev_id IS NOT NULL AND s.platform='ios')                                                AS {schemas.FilterType.rev_id_ios}
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


SUPPORTED_TYPES = {
    schemas.FilterType.user_os: SupportedFilter(
        get=__generic_autocomplete(typename=schemas.FilterType.user_os),
        query=__generic_query(typename=schemas.FilterType.user_os),
        value_limit=0,
        starts_with="",
        starts_limit=0,
        ignore_if_starts_with=["/"]),
    schemas.FilterType.user_browser: SupportedFilter(
        get=__generic_autocomplete(typename=schemas.FilterType.user_browser),
        query=__generic_query(typename=schemas.FilterType.user_browser),
        value_limit=0,
        starts_with="",
        starts_limit=0,
        ignore_if_starts_with=["/"]),
    schemas.FilterType.user_device: SupportedFilter(
        get=__generic_autocomplete(typename=schemas.FilterType.user_device),
        query=__generic_query(typename=schemas.FilterType.user_device),
        value_limit=3,
        starts_with="",
        starts_limit=3,
        ignore_if_starts_with=["/"]),
    schemas.FilterType.user_country: SupportedFilter(
        get=__generic_autocomplete(typename=schemas.FilterType.user_country),
        query=__generic_query(typename=schemas.FilterType.user_country),
        value_limit=2,
        starts_with="",
        starts_limit=2,
        ignore_if_starts_with=["/"]),
    schemas.FilterType.user_id: SupportedFilter(
        get=__generic_autocomplete(typename=schemas.FilterType.user_id),
        query=__generic_query(typename=schemas.FilterType.user_id),
        value_limit=2,
        starts_with="",
        starts_limit=2,
        ignore_if_starts_with=["/"]),
    schemas.FilterType.user_anonymous_id: SupportedFilter(
        get=__generic_autocomplete(typename=schemas.FilterType.user_anonymous_id),
        query=__generic_query(typename=schemas.FilterType.user_anonymous_id),
        value_limit=3,
        starts_with="",
        starts_limit=3,
        ignore_if_starts_with=["/"]),
    schemas.FilterType.rev_id: SupportedFilter(
        get=__generic_autocomplete(typename=schemas.FilterType.rev_id),
        query=__generic_query(typename=schemas.FilterType.rev_id),
        value_limit=0,
        starts_with="",
        starts_limit=0,
        ignore_if_starts_with=["/"]),
    schemas.FilterType.referrer: SupportedFilter(
        get=__generic_autocomplete(typename=schemas.FilterType.referrer),
        query=__generic_query(typename=schemas.FilterType.referrer),
        value_limit=5,
        starts_with="/",
        starts_limit=5,
        ignore_if_starts_with=[]),
    schemas.FilterType.utm_campaign: SupportedFilter(
        get=__generic_autocomplete(typename=schemas.FilterType.utm_campaign),
        query=__generic_query(typename=schemas.FilterType.utm_campaign),
        value_limit=0,
        starts_with="",
        starts_limit=0,
        ignore_if_starts_with=["/"]),
    schemas.FilterType.utm_medium: SupportedFilter(
        get=__generic_autocomplete(typename=schemas.FilterType.utm_medium),
        query=__generic_query(typename=schemas.FilterType.utm_medium),
        value_limit=0,
        starts_with="",
        starts_limit=0,
        ignore_if_starts_with=["/"]),
    schemas.FilterType.utm_source: SupportedFilter(
        get=__generic_autocomplete(typename=schemas.FilterType.utm_source),
        query=__generic_query(typename=schemas.FilterType.utm_source),
        value_limit=0,
        starts_with="",
        starts_limit=0,
        ignore_if_starts_with=["/"]),
    # IOS
    schemas.FilterType.user_os_ios: SupportedFilter(
        get=__generic_autocomplete(typename=schemas.FilterType.user_os_ios),
        query=__generic_query(typename=schemas.FilterType.user_os_ios),
        value_limit=0,
        starts_with="",
        starts_limit=0,
        ignore_if_starts_with=["/"]),
    schemas.FilterType.user_device_ios: SupportedFilter(
        get=__generic_autocomplete(
            typename=schemas.FilterType.user_device_ios),
        query=__generic_query(typename=schemas.FilterType.user_device_ios),
        value_limit=3,
        starts_with="",
        starts_limit=3,
        ignore_if_starts_with=["/"]),
    schemas.FilterType.user_country_ios: SupportedFilter(
        get=__generic_autocomplete(typename=schemas.FilterType.user_country_ios),
        query=__generic_query(typename=schemas.FilterType.user_country_ios),
        value_limit=2,
        starts_with="",
        starts_limit=2,
        ignore_if_starts_with=["/"]),
    schemas.FilterType.user_id_ios: SupportedFilter(
        get=__generic_autocomplete(typename=schemas.FilterType.user_id_ios),
        query=__generic_query(typename=schemas.FilterType.user_id_ios),
        value_limit=2,
        starts_with="",
        starts_limit=2,
        ignore_if_starts_with=["/"]),
    schemas.FilterType.user_anonymous_id_ios: SupportedFilter(
        get=__generic_autocomplete(typename=schemas.FilterType.user_anonymous_id_ios),
        query=__generic_query(typename=schemas.FilterType.user_anonymous_id_ios),
        value_limit=3,
        starts_with="",
        starts_limit=3,
        ignore_if_starts_with=["/"]),
    schemas.FilterType.rev_id_ios: SupportedFilter(
        get=__generic_autocomplete(typename=schemas.FilterType.rev_id_ios),
        query=__generic_query(typename=schemas.FilterType.rev_id_ios),
        value_limit=0,
        starts_with="",
        starts_limit=0,
        ignore_if_starts_with=["/"]),

}


def search(text, meta_type, project_id):
    rows = []
    if meta_type not in list(SUPPORTED_TYPES.keys()):
        return {"errors": ["unsupported type"]}
    rows += SUPPORTED_TYPES[meta_type].get(project_id=project_id, text=text)
    if meta_type + "_IOS" in list(SUPPORTED_TYPES.keys()):
        rows += SUPPORTED_TYPES[meta_type + "_IOS"].get(project_id=project_id, text=text)
    return {"data": rows}
